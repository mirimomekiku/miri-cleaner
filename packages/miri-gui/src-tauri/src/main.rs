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
            commands::get_audit_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running Miri Cleaner desktop application");
}
