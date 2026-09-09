//! File-level operations backing the Storage & Duplicates context menu
//! (delete, reveal in file manager, properties). Every entry point here
//! takes a raw path straight from the frontend, so `miri_core::harden_path`
//! is the single choke point all of them route through before touching disk
//! or spawning a shell process -- the same hardening (and, for batch
//! clears, the same trash-moving loop) the CLI's `browser-data --clear` and
//! any other Rust frontend use, kept in one place instead of redefined here.

use crate::commands::SimpleResult;
use miri_core::{harden_path, move_paths_to_trash};
use serde::Serialize;
use std::path::Path;
use std::process::Command;
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize)]
pub struct FileProperties {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified_ms: Option<i64>,
    pub created_ms: Option<i64>,
    pub readonly: bool,
}

fn system_time_to_millis(t: std::io::Result<SystemTime>) -> Option<i64> {
    t.ok()
        .and_then(|time| time.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
}

/// Moves the file or folder to the OS trash / recycle bin. Never a
/// permanent unlink -- deletions made from Storage & Duplicates must stay
/// recoverable, matching the app's snapshot-first safety story elsewhere.
#[tauri::command]
pub fn delete_path(path: String) -> Result<SimpleResult, String> {
    let target = harden_path(&path)?;
    let display = target.display().to_string();
    trash::delete(&target).map_err(|e| format!("Failed to move \"{display}\" to the trash: {e}"))?;
    Ok(SimpleResult {
        success: true,
        details: format!("Moved \"{display}\" to the recycle bin."),
    })
}

/// Moves every path belonging to one browser data category (e.g. all of a
/// profile's "Cache" directories) to the trash. Each path is hardened and
/// deleted independently and best-effort -- a locked file (the browser is
/// still running) shouldn't stop the rest of the category from clearing,
/// so failures are collected and reported rather than aborting the batch.
#[tauri::command]
pub fn clear_browser_data(paths: Vec<String>) -> Result<SimpleResult, String> {
    let (cleared, details) = move_paths_to_trash(&paths);
    if paths.is_empty() || cleared > 0 {
        Ok(SimpleResult {
            success: true,
            details,
        })
    } else {
        Err(details)
    }
}

#[cfg(target_os = "windows")]
fn reveal_impl(target: &Path) -> Result<(), String> {
    let mut select_arg = std::ffi::OsString::from("/select,");
    select_arg.push(target.as_os_str());
    Command::new("explorer")
        .arg(select_arg)
        .spawn()
        .map_err(|e| format!("Failed to open File Explorer: {e}"))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn reveal_impl(target: &Path) -> Result<(), String> {
    if Command::new("nautilus")
        .arg("--select")
        .arg(target)
        .spawn()
        .is_ok()
    {
        return Ok(());
    }
    let parent = target.parent().unwrap_or(target);
    Command::new("xdg-open")
        .arg(parent)
        .spawn()
        .map_err(|e| format!("Failed to open a file manager: {e}"))?;
    Ok(())
}

/// Reveals the path in the platform's default graphical file manager:
/// Explorer with the item pre-selected on Windows, Nautilus with the item
/// pre-selected on Fedora/GNOME (falling back to just opening the
/// containing folder if Nautilus isn't the installed file manager).
#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let target = harden_path(&path)?;
    reveal_impl(&target)
}

/// Returns file metadata for an in-app "Properties" panel. Deliberately
/// data-only (no OS shell-out) so it behaves identically on Fedora and
/// Windows instead of depending on a native properties dialog that only
/// one platform actually has.
#[tauri::command]
pub fn get_file_properties(path: String) -> Result<FileProperties, String> {
    let target = harden_path(&path)?;
    let metadata =
        std::fs::metadata(&target).map_err(|e| format!("Failed to read file info: {e}"))?;

    Ok(FileProperties {
        name: target
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| target.display().to_string()),
        path: target.display().to_string(),
        is_dir: metadata.is_dir(),
        size_bytes: metadata.len(),
        modified_ms: system_time_to_millis(metadata.modified()),
        created_ms: system_time_to_millis(metadata.created()),
        readonly: metadata.permissions().readonly(),
    })
}
