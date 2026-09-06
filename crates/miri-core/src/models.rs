use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OsType {
    Linux,
    Windows,
    MacOS,
    Unknown,
}

impl OsType {
    pub fn current() -> Self {
        #[cfg(target_os = "linux")]
        {
            OsType::Linux
        }
        #[cfg(target_os = "windows")]
        {
            OsType::Windows
        }
        #[cfg(target_os = "macos")]
        {
            OsType::MacOS
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            OsType::Unknown
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Safe,
    Moderate,
    Aggressive,
    Dangerous,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CleanCategory {
    SystemTemp,
    BrowserCache,
    PackageManagers,
    SystemLogs,
    OldKernels,
    DevCaches,
    WindowsUpdate,
    UserTrash,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanTarget {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: CleanCategory,
    pub risk_level: RiskLevel,
    pub requires_elevation: bool,
    pub paths: Vec<String>,
    pub estimated_bytes: u64,
    pub file_count: usize,
    pub locked_count: usize,
    pub enabled_by_default: bool,
    pub is_removable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: OsType,
    pub os_name: String,
    pub kernel_version: String,
    pub hostname: String,
    pub is_elevated: bool,
    pub total_disk_space: u64,
    pub free_disk_space: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub timestamp: String,
    pub system_info: SystemInfo,
    pub targets: Vec<CleanTarget>,
    pub total_reclaimable_bytes: u64,
    pub total_files: usize,
    pub total_locked: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanExecutionPlan {
    pub target_ids: Vec<String>,
    pub dry_run: bool,
    pub create_snapshot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanExecutionResult {
    pub audit_id: String,
    pub freed_bytes: u64,
    pub deleted_files: usize,
    pub skipped_files: usize,
    pub errors: Vec<String>,
    pub snapshot_id: Option<String>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotStatus {
    pub is_available: bool,
    pub provider_name: String,
    pub last_snapshot: Option<String>,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsUpdateState {
    pub services_disabled: bool,
    pub gpo_policies_active: bool,
    pub scheduled_tasks_disabled: bool,
    pub metered_network_shield: bool,
    pub fully_disabled: bool,
    #[serde(default)]
    pub active_profile: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: String,
    pub operation: String,
    pub target_ids: Vec<String>,
    pub freed_bytes: u64,
    pub snapshot_id: Option<String>,
    pub rollback_payload: HashMap<String, String>,
    pub is_rolled_back: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WindowsTweakCategory {
    Essential,
    AdvancedCaution,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsVersionInfo {
    pub version: u32,             // 10 or 11
    pub build_number: u32,        // e.g. 19045 or 22631
    pub display_name: String,     // e.g. "Windows 11 Pro (23H2)"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowsTweakItem {
    pub id: String,
    pub name: String,
    pub category: WindowsTweakCategory,
    pub description: String,
    pub min_windows_version: Option<u32>,
    pub requires_admin: bool,
    pub danger_level: RiskLevel,
    pub is_enabled: bool,
    pub is_applicable: bool,
    pub command: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LinuxTweakCategory {
    Essential,
    Optimization,
    GnomeExtension,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinuxTweakItem {
    pub id: String,
    pub name: String,
    pub category: LinuxTweakCategory,
    pub description: String,
    pub requires_root: bool,
    pub danger_level: RiskLevel,
    pub is_applied: bool,
    pub is_applicable: bool,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsInfo {
    pub current_preset: String,
    pub servers: Vec<String>,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TweakActionReport {
    pub name: String,
    pub succeeded: bool,
    pub details: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Browsers,
    Communication,
    Development,
    Gaming,
    MediaTools,
    Utilities,
    Privacy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDefinition {
    pub id: String,
    pub name: String,
    pub category: AppCategory,
    pub description: String,
    pub windows_winget_id: String,
    pub linux_flatpak_id: String,
    pub linux_dnf_package: Option<String>,
    pub is_installed: bool,
}


