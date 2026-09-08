// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan_all,
            commands::execute_clean,
            commands::get_snapshot_status,
            commands::get_windows_update_state,
            commands::set_windows_updates,
            commands::execute_linux_tweak,
            commands::get_audit_history,
            commands::rollback_snapshot,
            commands::get_windows_tweaks,
            commands::apply_windows_tweaks,
            commands::get_linux_tweaks,
            commands::apply_linux_tweaks,
            commands::get_dns_info,
            commands::set_dns,
            commands::get_windows_version_info,
            commands::get_apps_catalog,
            commands::install_apps,
            commands::uninstall_app,
            commands::uninstall_apps,
            commands::get_installed_app_usage,
            commands::get_xray,
            commands::get_leftovers,
            commands::clean_leftovers,
            commands::get_autostart,
            commands::toggle_autostart,
            commands::get_duplicates,
            commands::reflink_duplicates,
            commands::get_vitals,
            commands::set_power_profile,
            commands::compact_snapshots
        ])
        .run(tauri::generate_context!())
        .expect("error while running Miri Cleaner desktop application");
}
