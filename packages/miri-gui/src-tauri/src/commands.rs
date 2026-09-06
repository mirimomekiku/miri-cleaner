use miri_core::{
    AuditEntry, AuditJournal, CleanExecutionPlan, CleanExecutionResult, LinuxTweaks, ScanResult,
    Scanner, SnapshotManager, SnapshotStatus, WindowsTweaks, WindowsUpdateState,
};

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
