#[cfg(target_os = "linux")]
use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemVitalsReport {
    pub battery: Option<BatteryVitals>,
    pub power_profile: Option<PowerProfileVitals>,
    pub disk_health: DiskHealthSummary,
    pub snapshot_compactor: SnapshotCompactorInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryVitals {
    pub percentage: u32,
    pub status: String,
    pub cycle_count: Option<u32>,
    pub health_percentage: Option<u32>,
    pub power_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerProfileVitals {
    pub active_profile: String,
    pub available_profiles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskHealthSummary {
    pub filesystem: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub is_btrfs: bool,
    pub trim_supported: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotCompactorInfo {
    pub provider: String,
    pub total_snapshots: usize,
    pub older_than_14d_count: usize,
    pub older_than_30d_count: usize,
    pub estimated_reclaimable_mb: u64,
}

pub struct SystemVitals;

impl SystemVitals {
    pub fn get_report() -> SystemVitalsReport {
        let battery = Self::read_battery();
        let power_profile = Self::read_power_profile();
        let disk_health = Self::read_disk_health();
        let snapshot_compactor = Self::read_snapshot_compactor();

        SystemVitalsReport {
            battery,
            power_profile,
            disk_health,
            snapshot_compactor,
        }
    }

    fn read_battery() -> Option<BatteryVitals> {
        #[cfg(target_os = "linux")]
        {
            let bat_paths = ["/sys/class/power_supply/BAT0", "/sys/class/power_supply/BAT1"];
            for base in &bat_paths {
                let p = Path::new(base);
                if p.exists() {
                    let cap_str = fs::read_to_string(p.join("capacity")).unwrap_or_default();
                    let percentage = cap_str.trim().parse::<u32>().unwrap_or(100);
                    let status = fs::read_to_string(p.join("status")).unwrap_or_else(|_| "Discharging".to_string()).trim().to_string();
                    let cycle_count = fs::read_to_string(p.join("cycle_count")).ok().and_then(|s| s.trim().parse::<u32>().ok());

                    let energy_full = fs::read_to_string(p.join("energy_full")).ok().and_then(|s| s.trim().parse::<f64>().ok());
                    let energy_design = fs::read_to_string(p.join("energy_full_design")).ok().and_then(|s| s.trim().parse::<f64>().ok());
                    let health_pct = match (energy_full, energy_design) {
                        (Some(full), Some(design)) if design > 0.0 => Some(((full / design) * 100.0).min(100.0) as u32),
                        _ => None,
                    };

                    return Some(BatteryVitals {
                        percentage,
                        status: status.clone(),
                        cycle_count,
                        health_percentage: health_pct,
                        power_source: if status.to_lowercase().contains("charging") { "AC Adapter".to_string() } else { "Battery".to_string() },
                    });
                }
            }
        }
        None
    }

    fn read_power_profile() -> Option<PowerProfileVitals> {
        #[cfg(target_os = "linux")]
        {
            if let Ok(out) = Command::new("powerprofilesctl").arg("get").output() {
                if out.status.success() {
                    let active = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    return Some(PowerProfileVitals {
                        active_profile: active,
                        available_profiles: vec![
                            "performance".to_string(),
                            "balanced".to_string(),
                            "power-saver".to_string(),
                        ],
                    });
                }
            }
        }
        None
    }

    fn read_disk_health() -> DiskHealthSummary {
        #[cfg(target_os = "linux")]
        {
            if let Ok(out) = Command::new("df").args(["-BG", "/"]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    if let Some(line) = text.lines().nth(1) {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 4 {
                            let total = parts[1].trim_end_matches('G').parse::<f64>().unwrap_or(0.0);
                            let used = parts[2].trim_end_matches('G').parse::<f64>().unwrap_or(0.0);
                            let free = parts[3].trim_end_matches('G').parse::<f64>().unwrap_or(0.0);

                            // `df` reports the device path, not the filesystem type; ask
                            // `findmnt` for the real fstype rather than string-sniffing.
                            let is_btrfs = Command::new("findmnt")
                                .args(["-n", "-o", "FSTYPE", "/"])
                                .output()
                                .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "btrfs")
                                .unwrap_or(false);

                            return DiskHealthSummary {
                                filesystem: if is_btrfs { "Btrfs".to_string() } else { "ext4".to_string() },
                                total_gb: total,
                                used_gb: used,
                                free_gb: free,
                                is_btrfs,
                                trim_supported: true,
                            };
                        }
                    }
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            let script = "Get-Volume -DriveLetter C | Select-Object @{N='Total';E={$_.Size}},@{N='Free';E={$_.SizeRemaining}},FileSystemType | ConvertTo-Json -Compress";
            if let Ok(out) = Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", script])
                .output()
            {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text.trim()) {
                        let total_bytes = json.get("Total").and_then(|v| v.as_f64());
                        let free_bytes = json.get("Free").and_then(|v| v.as_f64());
                        let fs_type = json.get("FileSystemType").and_then(|v| v.as_str()).unwrap_or("NTFS");
                        if let (Some(total_b), Some(free_b)) = (total_bytes, free_bytes) {
                            let total = total_b / 1_073_741_824.0;
                            let free = free_b / 1_073_741_824.0;
                            return DiskHealthSummary {
                                filesystem: fs_type.to_string(),
                                total_gb: total,
                                used_gb: (total - free).max(0.0),
                                free_gb: free,
                                is_btrfs: false,
                                trim_supported: true,
                            };
                        }
                    }
                }
            }
        }

        // Real disk stats couldn't be determined on this platform/config -- report
        // that honestly (zeroed) rather than fabricating plausible-looking numbers.
        DiskHealthSummary {
            filesystem: "Unknown".to_string(),
            total_gb: 0.0,
            used_gb: 0.0,
            free_gb: 0.0,
            is_btrfs: false,
            trim_supported: false,
        }
    }

    /// Parses `snapper list`'s table output into (snapshot number, age in days)
    /// pairs, skipping the header/separator rows and the always-present
    /// snapshot 0 ("current"), which cannot be deleted or dated.
    #[cfg(target_os = "linux")]
    fn parse_snapper_snapshots(list_output: &str) -> Vec<(u32, i64)> {
        let now = chrono::Utc::now().naive_utc();
        list_output
            .lines()
            .filter_map(|line| {
                let cols: Vec<&str> = line.split('|').map(|c| c.trim()).collect();
                if cols.len() < 4 {
                    return None;
                }
                let number: u32 = cols[0].parse().ok()?;
                if number == 0 {
                    return None;
                }
                let date_str = cols[3];
                if date_str.is_empty() {
                    return None;
                }
                let parsed = chrono::NaiveDateTime::parse_from_str(date_str, "%a %d %b %Y %H:%M:%S").ok()?;
                let age_days = (now - parsed).num_days();
                Some((number, age_days))
            })
            .collect()
    }

    /// Parses `timeshift --list`'s output into (snapshot name, age in days)
    /// pairs. Snapshot names are themselves timestamps (`YYYY-MM-DD_HH-MM-SS`).
    #[cfg(target_os = "linux")]
    fn parse_timeshift_snapshots(list_output: &str) -> Vec<(String, i64)> {
        let now = chrono::Utc::now().naive_utc();
        list_output
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim();
                let name = trimmed.split_whitespace().next()?;
                let parsed = chrono::NaiveDateTime::parse_from_str(name, "%Y-%m-%d_%H-%M-%S").ok()?;
                let age_days = (now - parsed).num_days();
                Some((name.to_string(), age_days))
            })
            .collect()
    }

    fn read_snapshot_compactor() -> SnapshotCompactorInfo {
        #[cfg(target_os = "linux")]
        {
            let has_snapper = RuleEngine::command_exists("snapper");
            if has_snapper {
                if let Ok(out) = Command::new("snapper").args(["list", "-t", "single"]).output() {
                    if out.status.success() {
                        let snaps = Self::parse_snapper_snapshots(&String::from_utf8_lossy(&out.stdout));
                        return SnapshotCompactorInfo {
                            provider: "Snapper (Btrfs)".to_string(),
                            total_snapshots: snaps.len(),
                            older_than_14d_count: snaps.iter().filter(|(_, age)| *age >= 14).count(),
                            older_than_30d_count: snaps.iter().filter(|(_, age)| *age >= 30).count(),
                            // Btrfs snapshots share extents with the live subvolume (CoW),
                            // so a per-snapshot "size" isn't meaningful without an expensive
                            // `btrfs fi du` walk; report 0 rather than a fabricated estimate.
                            estimated_reclaimable_mb: 0,
                        };
                    }
                }
            }

            let has_timeshift = RuleEngine::command_exists("timeshift");
            if has_timeshift {
                if let Ok(out) = Command::new("timeshift").arg("--list").output() {
                    if out.status.success() {
                        let snaps = Self::parse_timeshift_snapshots(&String::from_utf8_lossy(&out.stdout));
                        return SnapshotCompactorInfo {
                            provider: "Timeshift".to_string(),
                            total_snapshots: snaps.len(),
                            older_than_14d_count: snaps.iter().filter(|(_, age)| *age >= 14).count(),
                            older_than_30d_count: snaps.iter().filter(|(_, age)| *age >= 30).count(),
                            estimated_reclaimable_mb: 0,
                        };
                    }
                }
            }

            SnapshotCompactorInfo {
                provider: "None detected".to_string(),
                total_snapshots: 0,
                older_than_14d_count: 0,
                older_than_30d_count: 0,
                estimated_reclaimable_mb: 0,
            }
        }

        #[cfg(target_os = "windows")]
        {
            let script = "Get-ComputerRestorePoint | Select-Object CreationTime | ConvertTo-Json -Compress";
            if let Ok(out) = Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", script])
                .output()
            {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text.trim()) {
                        // A single restore point deserializes as an object, several as an array.
                        let points: Vec<&serde_json::Value> = match &json {
                            serde_json::Value::Array(arr) => arr.iter().collect(),
                            serde_json::Value::Object(_) => vec![&json],
                            _ => vec![],
                        };
                        let now = chrono::Utc::now().naive_utc();
                        let ages: Vec<i64> = points
                            .iter()
                            .filter_map(|p| p.get("CreationTime")?.as_str())
                            .filter_map(|s| {
                                // PowerShell's ConvertTo-Json renders DateTime as
                                // "/Date(<epoch-ms>)/" by default.
                                let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
                                let epoch_ms: i64 = digits.parse().ok()?;
                                let created = chrono::DateTime::from_timestamp_millis(epoch_ms)?.naive_utc();
                                Some((now - created).num_days())
                            })
                            .collect();
                        return SnapshotCompactorInfo {
                            provider: "Windows System Restore (VSS)".to_string(),
                            total_snapshots: ages.len(),
                            older_than_14d_count: ages.iter().filter(|age| **age >= 14).count(),
                            older_than_30d_count: ages.iter().filter(|age| **age >= 30).count(),
                            estimated_reclaimable_mb: 0,
                        };
                    }
                }
            }

            SnapshotCompactorInfo {
                provider: "Windows System Restore (VSS)".to_string(),
                total_snapshots: 0,
                older_than_14d_count: 0,
                older_than_30d_count: 0,
                estimated_reclaimable_mb: 0,
            }
        }
    }

    /// Deletes local snapshots older than `older_than_days`. Real deletion for
    /// Snapper (`snapper delete <N>`) and Timeshift (`timeshift --delete`) --
    /// both support removing an individual snapshot without touching the rest
    /// of the system. Windows System Restore has no equivalent granular
    /// deletion primitive available to this app (`vssadmin`/`Get-CimInstance
    /// SystemRestore` deletion is all-or-oldest, not "everything older than N
    /// days"), so that case is disclosed as unsupported rather than faked.
    pub fn prune_old_snapshots(older_than_days: u32) -> Result<String, String> {
        #[cfg(target_os = "linux")]
        {
            let cutoff = older_than_days as i64;

            let has_snapper = RuleEngine::command_exists("snapper");
            if has_snapper {
                let list_out = Command::new("snapper").args(["list", "-t", "single"]).output()
                    .map_err(|e| format!("Failed to list snapper snapshots: {}", e))?;
                let old: Vec<u32> = Self::parse_snapper_snapshots(&String::from_utf8_lossy(&list_out.stdout))
                    .into_iter()
                    .filter(|(_, age)| *age >= cutoff)
                    .map(|(number, _)| number)
                    .collect();

                if old.is_empty() {
                    return Ok(format!("No Snapper snapshots older than {} days were found.", older_than_days));
                }

                let mut deleted = 0usize;
                let mut errors = Vec::new();
                for number in &old {
                    let out = Command::new("snapper").args(["delete", &number.to_string()]).output();
                    match out {
                        Ok(o) if o.status.success() => deleted += 1,
                        Ok(o) => errors.push(format!("#{}: {}", number, String::from_utf8_lossy(&o.stderr).trim())),
                        Err(e) => errors.push(format!("#{}: {}", number, e)),
                    }
                }

                return if errors.is_empty() {
                    Ok(format!("Deleted {} Snapper snapshot(s) older than {} days.", deleted, older_than_days))
                } else if deleted > 0 {
                    Ok(format!("Deleted {} of {} snapshot(s); failures: {}", deleted, old.len(), errors.join("; ")))
                } else {
                    Err(format!("Failed to delete any snapshots: {}", errors.join("; ")))
                };
            }

            let has_timeshift = RuleEngine::command_exists("timeshift");
            if has_timeshift {
                let list_out = Command::new("timeshift").arg("--list").output()
                    .map_err(|e| format!("Failed to list Timeshift snapshots: {}", e))?;
                let old: Vec<String> = Self::parse_timeshift_snapshots(&String::from_utf8_lossy(&list_out.stdout))
                    .into_iter()
                    .filter(|(_, age)| *age >= cutoff)
                    .map(|(name, _)| name)
                    .collect();

                if old.is_empty() {
                    return Ok(format!("No Timeshift snapshots older than {} days were found.", older_than_days));
                }

                let mut deleted = 0usize;
                let mut errors = Vec::new();
                for name in &old {
                    let out = Command::new("timeshift").args(["--delete", "--snapshot", name, "--yes"]).output();
                    match out {
                        Ok(o) if o.status.success() => deleted += 1,
                        Ok(o) => errors.push(format!("{}: {}", name, String::from_utf8_lossy(&o.stderr).trim())),
                        Err(e) => errors.push(format!("{}: {}", name, e)),
                    }
                }

                return if errors.is_empty() {
                    Ok(format!("Deleted {} Timeshift snapshot(s) older than {} days.", deleted, older_than_days))
                } else if deleted > 0 {
                    Ok(format!("Deleted {} of {} snapshot(s); failures: {}", deleted, old.len(), errors.join("; ")))
                } else {
                    Err(format!("Failed to delete any snapshots: {}", errors.join("; ")))
                };
            }

            Ok("No local snapshot tool (Snapper or Timeshift) detected; nothing to compact.".to_string())
        }
        #[cfg(not(target_os = "linux"))]
        {
            let _ = older_than_days;
            Err("Windows System Restore does not support deleting individual checkpoints by age. \
                 Open \"Configure System Restore\" and delete old restore points manually, or use \
                 Disk Cleanup's \"Clean up system restore and shadow copies\" option.".to_string())
        }
    }

    /// Sets power profile on Fedora/Linux
    pub fn set_power_profile(profile: &str) -> Result<String, String> {
        #[cfg(target_os = "linux")]
        {
            let out = Command::new("powerprofilesctl")
                .args(["set", profile])
                .output()
                .map_err(|e| e.to_string())?;

            if out.status.success() {
                Ok(format!("Power profile switched to: {}", profile))
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
        #[cfg(target_os = "windows")]
        {
            // Windows' three built-in power schemes, addressed by their well-known
            // (constant across all Windows installs) GUIDs.
            let guid = match profile.to_lowercase().as_str() {
                "performance" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
                "power-saver" | "powersaver" | "battery-saver" => "a1841308-3541-4fab-bc81-f71556f20b4a",
                _ => "381b4222-f694-41f0-9685-ff5bb260df2e", // balanced
            };
            let out = Command::new("powercfg")
                .args(["/setactive", guid])
                .output()
                .map_err(|e| e.to_string())?;

            if out.status.success() {
                Ok(format!("Power plan switched to: {}", profile))
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows")))]
        {
            Err(format!("Power profile switching is not supported on this platform (requested: {}).", profile))
        }
    }
}
