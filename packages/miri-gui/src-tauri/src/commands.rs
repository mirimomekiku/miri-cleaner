use miri_core::{
    AppDefinition, AppLeftover, AppManager, AuditEntry, AuditJournal, AutostartItem,
    AutostartManager, CleanExecutionPlan, CleanExecutionResult, DnsInfo, DuplicateFinder,
    DuplicateGroup, InstalledAppUsage, LeftoversScanner, LinuxTweakItem, LinuxTweaks, RuleEngine,
    ScanResult, Scanner, SnapshotManager, SnapshotStatus, SpaceXRay, SystemVitals,
    SystemVitalsReport, TweakActionReport, WindowsTweakItem, WindowsTweaks, WindowsUpdateState,
    WindowsVersionInfo, XRayReport,
};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct SimpleResult {
    pub success: bool,
    pub details: String,
}

#[tauri::command]
pub fn scan_all() -> Result<ScanResult, String> {
    Ok(Scanner::scan_all())
}

#[tauri::command]
pub fn execute_clean(plan: CleanExecutionPlan) -> Result<CleanExecutionResult, String> {
    let scan = Scanner::scan_all();
    let result = miri_core::Executor::execute_plan(&plan, &scan.targets);
    Ok(result)
}

#[tauri::command]
pub fn get_snapshot_status() -> Result<SnapshotStatus, String> {
    Ok(SnapshotManager::get_status())
}

/// Takes a real, on-demand safety snapshot right now (Snapper/Timeshift on
/// Linux, a VSS System Restore point on Windows) rather than only ever
/// creating one as a side effect of `execute_clean`. Returns the resulting
/// snapshot/checkpoint id so the caller can display or later reference it.
#[tauri::command]
pub fn create_manual_snapshot() -> Result<String, String> {
    SnapshotManager::create_safety_checkpoint("manual-checkpoint")
}

#[tauri::command]
pub fn get_windows_update_state() -> Result<WindowsUpdateState, String> {
    Ok(WindowsTweaks::get_update_state())
}

#[tauri::command]
pub fn set_windows_updates(disabled: bool) -> Result<bool, String> {
    if disabled {
        WindowsTweaks::disable_windows_updates().map(|_| true)
    } else {
        WindowsTweaks::restore_windows_updates().map(|_| true)
    }
}

#[tauri::command]
pub fn execute_linux_tweak(tweak_name: String) -> Result<String, String> {
    match tweak_name.as_str() {
        "dnf-clean" => LinuxTweaks::clean_dnf_cache().map(|r| r.details),
        "journal-vacuum" => LinuxTweaks::vacuum_systemd_journal().map(|r| r.details),
        "flatpak-clean" => LinuxTweaks::clean_flatpak_unused().map(|r| r.details),
        "cargo-cache" => {
            let rep = miri_core::DevCacheCleaner::clean_cargo_cache();
            Ok(rep.message)
        }
        "npm-cache" => {
            let rep = miri_core::DevCacheCleaner::clean_npm_cache();
            Ok(rep.message)
        }
        "docker-prune" => {
            let rep = miri_core::DevCacheCleaner::clean_docker_images();
            Ok(rep.message)
        }
        "go-cache" => {
            let rep = miri_core::DevCacheCleaner::clean_go_cache();
            Ok(rep.message)
        }
        _ => Err(format!("Unknown tweak: {}", tweak_name)),
    }
}

#[tauri::command]
pub fn get_audit_history() -> Result<Vec<AuditEntry>, String> {
    Ok(AuditJournal::load_entries())
}

/// Restores files and settings to the pre-operation snapshot checkpoint recorded
/// for this audit entry. Only a real Snapper snapshot number can be rolled back
/// automatically (via `snapper undochange`, which is file-scoped and reboot-free).
/// Timeshift and Windows System Restore checkpoints are full-system reverts that
/// this app deliberately does not automate - see `SnapshotManager::rollback_snapshot`.
#[tauri::command]
pub fn rollback_snapshot(audit_id: String) -> Result<String, String> {
    SnapshotManager::rollback_snapshot(&audit_id)
}

// ==========================================
// OS Tweaks
// ==========================================

#[tauri::command]
pub fn get_windows_tweaks() -> Result<Vec<WindowsTweakItem>, String> {
    Ok(WindowsTweaks::get_all_tweaks())
}

#[tauri::command]
pub fn apply_windows_tweaks(
    ids: Vec<String>,
    restore_point: bool,
) -> Result<Vec<TweakActionReport>, String> {
    WindowsTweaks::apply_batch(&ids, restore_point)
}

#[tauri::command]
pub fn get_linux_tweaks() -> Result<Vec<LinuxTweakItem>, String> {
    Ok(LinuxTweaks::get_all_tweaks())
}

#[tauri::command]
pub fn apply_linux_tweaks(ids: Vec<String>) -> Result<Vec<TweakActionReport>, String> {
    LinuxTweaks::apply_batch(&ids)
}

#[tauri::command]
pub fn get_dns_info() -> Result<DnsInfo, String> {
    Ok(miri_core::detect_system_dns())
}

#[tauri::command]
pub fn set_dns(preset: String) -> Result<TweakActionReport, String> {
    miri_core::set_system_dns(&preset)
}

#[tauri::command]
pub fn get_windows_version_info() -> Result<WindowsVersionInfo, String> {
    Ok(WindowsTweaks::detect_windows_version())
}

// ==========================================
// Apps
// ==========================================

#[tauri::command]
pub fn get_apps_catalog() -> Result<Vec<AppDefinition>, String> {
    Ok(AppManager::get_catalog())
}

#[tauri::command]
pub fn install_apps(
    ids: Vec<String>,
    backend: Option<String>,
) -> Result<Vec<TweakActionReport>, String> {
    AppManager::install_batch(&ids, backend.as_deref())
}

#[tauri::command]
pub fn uninstall_app(id: String) -> Result<TweakActionReport, String> {
    AppManager::uninstall_app(&id)
}

#[tauri::command]
pub fn uninstall_apps(ids: Vec<String>) -> Result<Vec<TweakActionReport>, String> {
    AppManager::uninstall_batch(&ids)
}

/// Best-effort "last used" estimates for installed catalog apps. See
/// `AppManager::get_installed_app_usage` for the documented per-OS heuristic
/// (Flatpak/config-dir mtime on Linux, Prefetch mtime on Windows) - apps for
/// which no signal could be found are simply omitted, never guessed.
#[tauri::command]
pub fn get_installed_app_usage() -> Result<Vec<InstalledAppUsage>, String> {
    Ok(AppManager::get_installed_app_usage())
}

// ==========================================
// Space X-Ray
// ==========================================

#[tauri::command]
pub fn get_xray(target_path: Option<String>) -> Result<XRayReport, String> {
    Ok(SpaceXRay::scan_path(target_path.as_deref()))
}

// ==========================================
// App Leftovers
// ==========================================

#[tauri::command]
pub fn get_leftovers() -> Result<Vec<AppLeftover>, String> {
    Ok(LeftoversScanner::scan_leftovers())
}

#[tauri::command]
pub fn clean_leftovers() -> Result<SimpleResult, String> {
    let leftovers = LeftoversScanner::scan_leftovers();
    let removable: Vec<AppLeftover> = leftovers.into_iter().filter(|l| l.is_removable).collect();

    if removable.is_empty() {
        return Ok(SimpleResult {
            success: true,
            details: "No orphaned application leftovers found.".to_string(),
        });
    }

    let mut total_freed: u64 = 0;
    let mut errors: Vec<String> = Vec::new();

    for leftover in &removable {
        match LeftoversScanner::delete_leftover(&leftover.paths) {
            Ok(freed) => total_freed += freed,
            Err(e) => errors.push(format!("{}: {}", leftover.app_name, e)),
        }
    }

    let freed_mb = total_freed as f64 / (1024.0 * 1024.0);
    if errors.is_empty() {
        Ok(SimpleResult {
            success: true,
            details: format!("Purged {:.2} MB of orphaned application caches.", freed_mb),
        })
    } else {
        Ok(SimpleResult {
            success: false,
            details: format!(
                "Purged {:.2} MB, but {} item(s) failed: {}",
                freed_mb,
                errors.len(),
                errors.join("; ")
            ),
        })
    }
}

// ==========================================
// Autostart / Boot Impact
// ==========================================

#[tauri::command]
pub fn get_autostart() -> Result<Vec<AutostartItem>, String> {
    Ok(AutostartManager::get_autostart_items())
}

#[tauri::command]
pub fn toggle_autostart(file_path: String, enable: bool) -> Result<SimpleResult, String> {
    match AutostartManager::toggle_item(&file_path, enable) {
        Ok(now_enabled) => Ok(SimpleResult {
            success: true,
            details: format!(
                "Autostart entry {}.",
                if now_enabled { "enabled" } else { "disabled" }
            ),
        }),
        Err(e) => Err(e),
    }
}

// ==========================================
// Duplicates
// ==========================================

#[tauri::command]
pub fn get_duplicates(target_path: Option<String>) -> Result<Vec<DuplicateGroup>, String> {
    Ok(DuplicateFinder::scan_duplicates(target_path.as_deref()))
}

#[tauri::command]
pub fn reflink_duplicates(target_path: Option<String>) -> Result<SimpleResult, String> {
    let groups = DuplicateFinder::scan_duplicates(target_path.as_deref());
    let reflinkable: Vec<DuplicateGroup> = groups.into_iter().filter(|g| g.can_reflink).collect();

    if reflinkable.is_empty() {
        return Ok(SimpleResult {
            success: true,
            details: "No reflink-eligible duplicate files found.".to_string(),
        });
    }

    let mut reflinked = 0u64;
    let mut bytes_saved = 0u64;
    let mut errors: Vec<String> = Vec::new();

    for group in &reflinkable {
        let original = match group.files.iter().find(|f| f.is_original) {
            Some(f) => f,
            None => continue,
        };

        // Reflink modifies file extents in place and must respect the same
        // safety blocklist as deletion - it currently has no such check inside
        // `reflink_deduplicate` itself, so it's enforced here before calling it.
        if RuleEngine::is_path_blocked(Path::new(&original.path)) {
            errors.push(format!("Original path is blocked: {}", original.path));
            continue;
        }

        for dup in group.files.iter().filter(|f| !f.is_original) {
            if RuleEngine::is_path_blocked(Path::new(&dup.path)) {
                errors.push(format!("Duplicate path is blocked: {}", dup.path));
                continue;
            }

            match DuplicateFinder::reflink_deduplicate(&original.path, &dup.path) {
                Ok(true) => {
                    reflinked += 1;
                    bytes_saved += group.file_size;
                }
                Ok(false) => errors.push(format!("Reflink failed for {}", dup.path)),
                Err(e) => errors.push(format!("{}: {}", dup.path, e)),
            }
        }
    }

    let saved_mb = bytes_saved as f64 / (1024.0 * 1024.0);
    if errors.is_empty() {
        Ok(SimpleResult {
            success: true,
            details: format!(
                "Reflinked {} duplicate file(s) using Btrfs CoW, sharing ~{:.2} MB of extents without deleting files.",
                reflinked, saved_mb
            ),
        })
    } else {
        Ok(SimpleResult {
            success: reflinked > 0,
            details: format!(
                "Reflinked {} file(s) (~{:.2} MB shared), {} error(s): {}",
                reflinked,
                saved_mb,
                errors.len(),
                errors.join("; ")
            ),
        })
    }
}

// ==========================================
// Safety & Vitals
// ==========================================

#[tauri::command]
pub fn get_vitals() -> Result<SystemVitalsReport, String> {
    Ok(SystemVitals::get_report())
}

#[tauri::command]
pub fn set_power_profile(profile: String) -> Result<String, String> {
    SystemVitals::set_power_profile(&profile)
}

#[tauri::command]
pub fn compact_snapshots(days: u32) -> Result<String, String> {
    SystemVitals::prune_old_snapshots(days)
}
