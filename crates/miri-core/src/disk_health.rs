//! SMART disk health monitoring, driven entirely by `smartctl`
//! (smartmontools) rather than a hand-rolled ATA/NVMe passthrough
//! implementation -- smartctl already handles the platform differences
//! (Linux `/dev/sdX`, `/dev/nvme0`, Windows `PhysicalDriveN`) and reports
//! structured JSON via `-j`, so this module is just discovery + parsing.
//!
//! Reading raw SMART data commonly requires elevated access (always on
//! Windows, often on Linux unless a udev rule grants the current user
//! access to the raw block device), so every read is attempted
//! unprivileged first and reported honestly as unavailable rather than
//! faked; [`DiskHealthMonitor::get_report_elevated`] is the explicit,
//! user-triggered retry that runs smartctl through the same pkexec/UAC
//! elevation path used elsewhere in the app.

use crate::elevation::ElevationManager;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartAttribute {
    pub id: u8,
    pub name: String,
    pub value: u8,
    pub worst: u8,
    pub threshold: u8,
    pub raw: String,
    /// "ok" | "warning" | "critical"
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskHealthInfo {
    pub device: String,
    pub model: String,
    pub serial: String,
    /// "ATA" | "NVMe" | "Unknown"
    pub interface: String,
    /// "healthy" | "warning" | "critical" | "unknown"
    pub overall_status: String,
    pub temperature_celsius: Option<i64>,
    pub power_on_hours: Option<u64>,
    pub power_cycle_count: Option<u64>,
    pub reallocated_sectors: Option<u64>,
    pub pending_sectors: Option<u64>,
    pub uncorrectable_errors: Option<u64>,
    /// NVMe wear-leveling indicator (0-100+, vendor-defined "used up" percentage).
    pub percentage_used: Option<u8>,
    pub attributes: Vec<SmartAttribute>,
    pub available: bool,
    pub unavailable_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskHealthReport {
    pub disks: Vec<DiskHealthInfo>,
    pub smartctl_installed: bool,
}

pub struct DiskHealthMonitor;

impl DiskHealthMonitor {
    fn smartctl_available() -> bool {
        let checker = if cfg!(target_os = "windows") { "where" } else { "which" };
        Command::new(checker)
            .arg("smartctl")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Lists devices smartctl can see on this platform. Uses `--scan` (not
    /// `--scan-open`), which reads platform device enumeration without
    /// opening each device, so it doesn't itself need elevated access.
    fn scan_devices() -> Vec<String> {
        let out = match Command::new("smartctl").args(["--scan", "-j"]).output() {
            Ok(o) => o,
            Err(_) => return vec![],
        };
        let json: Value = match serde_json::from_slice(&out.stdout) {
            Ok(v) => v,
            Err(_) => return vec![],
        };
        json.get("devices")
            .and_then(|d| d.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|d| d.get("name").and_then(|n| n.as_str()).map(String::from))
                    .collect()
            })
            .unwrap_or_default()
    }

    fn unavailable(device: &str, reason: String) -> DiskHealthInfo {
        DiskHealthInfo {
            device: device.to_string(),
            model: "Unknown".to_string(),
            serial: "Unknown".to_string(),
            interface: "Unknown".to_string(),
            overall_status: "unknown".to_string(),
            temperature_celsius: None,
            power_on_hours: None,
            power_cycle_count: None,
            reallocated_sectors: None,
            pending_sectors: None,
            uncorrectable_errors: None,
            percentage_used: None,
            attributes: vec![],
            available: false,
            unavailable_reason: Some(reason),
        }
    }

    fn parse_smart_json(device: &str, raw: &[u8]) -> DiskHealthInfo {
        let json: Value = match serde_json::from_slice(raw) {
            Ok(v) => v,
            Err(_) => {
                return Self::unavailable(
                    device,
                    "smartctl returned no readable data for this device.".to_string(),
                )
            }
        };

        // Permission/access failures usually surface as messages inside the
        // JSON body rather than as a nonzero exit code smartctl bubbles up
        // consistently, so check both.
        if let Some(messages) = json
            .get("smartctl")
            .and_then(|s| s.get("messages"))
            .and_then(|m| m.as_array())
        {
            let joined = messages
                .iter()
                .filter_map(|m| m.get("string").and_then(|s| s.as_str()))
                .collect::<Vec<_>>()
                .join("; ")
                .to_lowercase();
            if joined.contains("permission") || joined.contains("access is denied") {
                return Self::unavailable(
                    device,
                    "Permission denied -- try checking again with administrator access."
                        .to_string(),
                );
            }
        }

        let model = json
            .get("model_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Model")
            .to_string();
        let serial = json
            .get("serial_number")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let is_nvme = json.get("device").and_then(|d| d.get("type")).and_then(|t| t.as_str())
            == Some("nvme");
        let interface = if is_nvme { "NVMe" } else { "ATA" }.to_string();
        let passed = json
            .get("smart_status")
            .and_then(|s| s.get("passed"))
            .and_then(|p| p.as_bool());

        let mut temperature_celsius =
            json.get("temperature").and_then(|t| t.get("current")).and_then(|v| v.as_i64());
        let mut power_on_hours =
            json.get("power_on_time").and_then(|p| p.get("hours")).and_then(|v| v.as_u64());
        let mut power_cycle_count = json.get("power_cycle_count").and_then(|v| v.as_u64());
        let mut reallocated_sectors = None;
        let mut pending_sectors = None;
        let mut uncorrectable_errors = None;
        let mut percentage_used = None;
        let mut attributes = Vec::new();

        if is_nvme {
            if let Some(log) = json.get("nvme_smart_health_information_log") {
                temperature_celsius =
                    temperature_celsius.or_else(|| log.get("temperature").and_then(|v| v.as_i64()));
                power_on_hours =
                    power_on_hours.or_else(|| log.get("power_on_hours").and_then(|v| v.as_u64()));
                power_cycle_count =
                    power_cycle_count.or_else(|| log.get("power_cycles").and_then(|v| v.as_u64()));
                percentage_used =
                    log.get("percentage_used").and_then(|v| v.as_u64()).map(|v| v as u8);
                uncorrectable_errors = log.get("media_errors").and_then(|v| v.as_u64());
            }
        } else if let Some(table) = json
            .get("ata_smart_attributes")
            .and_then(|a| a.get("table"))
            .and_then(|t| t.as_array())
        {
            for attr in table {
                let id = attr.get("id").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
                let name = attr
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();
                let value = attr.get("value").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
                let worst = attr.get("worst").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
                let threshold = attr.get("thresh").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
                let raw_value =
                    attr.get("raw").and_then(|r| r.get("value")).and_then(|v| v.as_u64()).unwrap_or(0);
                let raw_string = attr
                    .get("raw")
                    .and_then(|r| r.get("string"))
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();

                // The handful of attribute IDs that actually predict drive
                // failure -- reallocated/pending sectors and uncorrectable
                // errors -- get surfaced as top-level fields the UI can
                // headline, in addition to living in the full table.
                match id {
                    5 => reallocated_sectors = Some(raw_value),
                    197 => pending_sectors = Some(raw_value),
                    198 => uncorrectable_errors = Some(raw_value),
                    _ => {}
                }

                let status = if threshold > 0 && value <= threshold {
                    "critical"
                } else if matches!(id, 5 | 187 | 188 | 197 | 198) && raw_value > 0 {
                    "warning"
                } else {
                    "ok"
                };

                attributes.push(SmartAttribute {
                    id,
                    name,
                    value,
                    worst,
                    threshold,
                    raw: if raw_string.is_empty() { raw_value.to_string() } else { raw_string },
                    status: status.to_string(),
                });
            }
        }

        let overall_status = if passed == Some(false) {
            "critical"
        } else if reallocated_sectors.unwrap_or(0) > 0
            || pending_sectors.unwrap_or(0) > 0
            || uncorrectable_errors.unwrap_or(0) > 0
            || percentage_used.unwrap_or(0) >= 90
        {
            "warning"
        } else if passed == Some(true) {
            "healthy"
        } else {
            "unknown"
        };

        DiskHealthInfo {
            device: device.to_string(),
            model,
            serial,
            interface,
            overall_status: overall_status.to_string(),
            temperature_celsius,
            power_on_hours,
            power_cycle_count,
            reallocated_sectors,
            pending_sectors,
            uncorrectable_errors,
            percentage_used,
            attributes,
            available: true,
            unavailable_reason: None,
        }
    }

    fn read_disk(device: &str, elevated: bool) -> DiskHealthInfo {
        let args = ["-a", "-j", device];
        let raw: Result<Vec<u8>, String> = if elevated {
            ElevationManager::run_elevated_command("smartctl", &args)
                .map(|(_, stdout, _)| stdout.into_bytes())
        } else {
            Command::new("smartctl")
                .args(args)
                .output()
                .map(|o| o.stdout)
                .map_err(|e| e.to_string())
        };

        match raw {
            Ok(bytes) if !bytes.is_empty() => Self::parse_smart_json(device, &bytes),
            Ok(_) => Self::unavailable(
                device,
                "smartctl returned no data -- try checking again with administrator access."
                    .to_string(),
            ),
            Err(e) => Self::unavailable(device, format!("Failed to run smartctl: {e}")),
        }
    }

    /// Best-effort, unprivileged SMART read for every disk smartctl can see.
    pub fn get_report() -> DiskHealthReport {
        if !Self::smartctl_available() {
            return DiskHealthReport { disks: vec![], smartctl_installed: false };
        }
        let devices = Self::scan_devices();
        let disks = devices.iter().map(|d| Self::read_disk(d, false)).collect();
        DiskHealthReport { disks, smartctl_installed: true }
    }

    /// Re-reads every scanned disk's SMART data with elevated privileges --
    /// the common case where an unprivileged read is refused (the default
    /// on Windows, and on Linux without a udev ACL granting raw device
    /// access to the current user).
    pub fn get_report_elevated() -> DiskHealthReport {
        if !Self::smartctl_available() {
            return DiskHealthReport { disks: vec![], smartctl_installed: false };
        }
        let devices = Self::scan_devices();
        let disks = devices.iter().map(|d| Self::read_disk(d, true)).collect();
        DiskHealthReport { disks, smartctl_installed: true }
    }
}
