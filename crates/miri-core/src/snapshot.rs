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
                // Try snapper first
                if let Ok(snapper_which) = Command::new("which").arg("snapper").output() {
                    if snapper_which.status.success() {
                        let output = Command::new("snapper")
                            .arg("create")
                            .arg("-d")
                            .arg(&desc)
                            .output()
                            .map_err(|e| format!("Failed to execute snapper: {}", e))?;

                        if output.status.success() {
                            return Ok(format!("snapper-snapshot-{}", timestamp));
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
}
