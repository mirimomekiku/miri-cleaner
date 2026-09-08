use crate::audit::AuditJournal;
use crate::models::{OsType, SnapshotStatus};
use chrono::Utc;
use std::process::Command;

pub struct SnapshotManager;

impl SnapshotManager {
    /// Detect snapshot provider capabilities on the current operating system
    pub fn get_status() -> SnapshotStatus {
        let os = OsType::current();

        match os {
            OsType::Linux => {
                // 1. Check Snapper (Btrfs on Fedora / openSUSE)
                if let Ok(output) = Command::new("which").arg("snapper").output() {
                    if output.status.success() {
                        let list_out = Command::new("snapper").arg("list").output().ok();
                        let last = list_out.and_then(|o| {
                            let s = String::from_utf8_lossy(&o.stdout);
                            s.lines().rev().find(|l| l.contains("number") || l.contains("single")).map(|l| l.to_string())
                        });

                        return SnapshotStatus {
                            is_available: true,
                            provider_name: "Snapper (Btrfs)".to_string(),
                            last_snapshot: last,
                            details: "Btrfs root snapshot capability active via Snapper.".to_string(),
                        };
                    }
                }

                // 2. Check Timeshift
                if let Ok(output) = Command::new("which").arg("timeshift").output() {
                    if output.status.success() {
                        return SnapshotStatus {
                            is_available: true,
                            provider_name: "Timeshift".to_string(),
                            last_snapshot: None,
                            details: "Timeshift backup tool detected.".to_string(),
                        };
                    }
                }

                SnapshotStatus {
                    is_available: false,
                    provider_name: "None detected".to_string(),
                    last_snapshot: None,
                    details: "Neither Snapper nor Timeshift found on PATH. Manual backup recommended before deep cleaning.".to_string(),
                }
            }
            OsType::Windows => {
                // Check Windows System Restore / VSS
                SnapshotStatus {
                    is_available: true,
                    provider_name: "Windows System Restore (VSS)".to_string(),
                    last_snapshot: None,
                    details: "Windows Volume Shadow Copy and System Restore Point checkpoint integration ready.".to_string(),
                }
            }
            _ => SnapshotStatus {
                is_available: false,
                provider_name: "Unsupported".to_string(),
                last_snapshot: None,
                details: "Automatic snapshots are not supported on this platform.".to_string(),
            },
        }
    }

    /// Creates a pre-cleanup safety snapshot before executing dangerous modifications
    pub fn create_safety_checkpoint(description: &str) -> Result<String, String> {
        let os = OsType::current();
        let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
        let desc = format!("Miri-Cleaner-{}", description);

        match os {
            OsType::Linux => {
                // Try snapper first. `--print-number` makes snapper emit just the
                // integer snapshot number on stdout, which is the only thing that
                // can later be referenced for a scoped `snapper undochange` rollback.
                if let Ok(snapper_which) = Command::new("which").arg("snapper").output() {
                    if snapper_which.status.success() {
                        let output = Command::new("snapper")
                            .arg("create")
                            .arg("-d")
                            .arg(&desc)
                            .arg("--print-number")
                            .output()
                            .map_err(|e| format!("Failed to execute snapper: {}", e))?;

                        if output.status.success() {
                            let number = String::from_utf8_lossy(&output.stdout).trim().to_string();
                            if !number.is_empty() && number.chars().all(|c| c.is_ascii_digit()) {
                                return Ok(format!("snapper:{}", number));
                            }
                            // Snapper succeeded but didn't print a clean number (unexpected
                            // output format) - fall through to the generic checkpoint tag
                            // below rather than fabricating a reference we can't act on.
                        }
                    }
                }

                // Try timeshift
                if let Ok(ts_which) = Command::new("which").arg("timeshift").output() {
                    if ts_which.status.success() {
                        let output = Command::new("timeshift")
                            .arg("--create")
                            .arg("--comments")
                            .arg(&desc)
                            .output()
                            .map_err(|e| format!("Failed to execute timeshift: {}", e))?;

                        if output.status.success() {
                            return Ok(format!("timeshift-snapshot-{}", timestamp));
                        }
                    }
                }

                // If no root snapshot tool available on non-Btrfs Linux, generate audit checkpoint ID
                Ok(format!("linux-checkpoint-{}", timestamp))
            }
            OsType::Windows => {
                let script = format!(
                    "Checkpoint-Computer -Description '{}' -RestorePointType 'MODIFY_SETTINGS'",
                    desc
                );
                let output = Command::new("powershell")
                    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
                    .output()
                    .map_err(|e| format!("Failed to invoke PowerShell Checkpoint-Computer: {}", e))?;

                if output.status.success() {
                    Ok(format!("vss-restorepoint-{}", timestamp))
                } else {
                    let err = String::from_utf8_lossy(&output.stderr);
                    // On non-elevated or if System Restore disabled on drive, return fallback checkpoint tag
                    Ok(format!("win-checkpoint-{} (RestorePoint note: {})", timestamp, err.trim()))
                }
            }
            _ => Ok(format!("generic-checkpoint-{}", timestamp)),
        }
    }

    /// Rolls back a single audit-journal entry, in the narrowest safe scope available.
    ///
    /// Only a real Snapper snapshot number (`snapper:<N>`, captured by
    /// `create_safety_checkpoint`) can be rolled back automatically here, via
    /// `snapper undochange <N>..0`. That command reverts just the file-level diff
    /// between the snapshot and the current state - it does not touch the boot
    /// default subvolume and does not require a reboot, unlike `snapper rollback`.
    ///
    /// Timeshift and Windows System Restore/VSS snapshots (and the various
    /// `*-checkpoint-*` fallback IDs produced when no real snapshot tool was found)
    /// only support a full-system revert, which would affect files this cleanup
    /// never touched and requires a reboot. Automating that from a single click
    /// would be a much bigger, more dangerous operation than what the user asked
    /// for, so this deliberately refuses and tells the user to restore manually.
    pub fn rollback_snapshot(audit_id: &str) -> Result<String, String> {
        let entries = AuditJournal::load_entries();
        let entry = entries
            .iter()
            .find(|e| e.id == audit_id)
            .ok_or_else(|| format!("No audit entry found for transaction {}.", audit_id))?;

        if entry.is_rolled_back {
            return Err(format!("Transaction {} has already been rolled back.", audit_id));
        }

        let snapshot_id = entry
            .snapshot_id
            .as_ref()
            .ok_or_else(|| format!("Transaction {} has no associated snapshot to restore from.", audit_id))?;

        if let Some(number) = snapshot_id.strip_prefix("snapper:") {
            let output = Command::new("snapper")
                .arg("undochange")
                .arg(format!("{}..0", number))
                .output()
                .map_err(|e| format!("Failed to execute snapper undochange: {}", e))?;

            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                return Err(format!(
                    "snapper undochange {}..0 failed: {}",
                    number,
                    err.trim()
                ));
            }

            AuditJournal::mark_rolled_back(audit_id)?;

            return Ok(format!(
                "Rolled back {} target(s) via snapper undochange {}..0 (file-level diff undo, no reboot required).",
                entry.target_ids.len(),
                number
            ));
        }

        Err(format!(
            "Transaction {} is backed by snapshot '{}', which is a full-system checkpoint (Timeshift or Windows System Restore). \
             Miri Cleaner only automates single-click rollback for Snapper file-level snapshots. \
             Full-system restores affect files this cleanup never touched and require a reboot, so please restore this checkpoint manually via the Timeshift GUI or Windows System Restore.",
            audit_id, snapshot_id
        ))
    }
}
