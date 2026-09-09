//! Small, hardened filesystem mutation helper shared by every frontend that
//! needs to move a user-picked path to the trash: the Tauri backend's
//! Storage & Duplicates context menu (`fs_ops.rs`, which calls straight
//! into this module rather than keeping its own copy) and the CLI's
//! `browser-data --clear`.

use crate::rules::RuleEngine;
use std::path::{Path, PathBuf};

/// Requires an absolute, existing, canonicalized path and refuses a fixed
/// set of filesystem roots and profile directories, so a caller can never
/// be tricked into operating on `/`, `C:\`, or the user's whole home folder.
pub fn harden_path(raw: &str) -> Result<PathBuf, String> {
    if raw.trim().is_empty() {
        return Err("No path was provided.".to_string());
    }
    let input = Path::new(raw);
    if !input.is_absolute() {
        return Err("Only absolute paths are allowed.".to_string());
    }
    let canonical = input
        .canonicalize()
        .map_err(|e| format!("Path does not exist or is inaccessible: {e}"))?;

    let mut forbidden: Vec<PathBuf> = Vec::new();
    if let Some(home) = RuleEngine::home_dir() {
        forbidden.push(home);
    }
    #[cfg(target_os = "windows")]
    {
        forbidden.push(PathBuf::from("C:\\"));
        forbidden.push(PathBuf::from("C:\\Windows"));
        forbidden.push(PathBuf::from("C:\\Program Files"));
        forbidden.push(PathBuf::from("C:\\Program Files (x86)"));
        forbidden.push(PathBuf::from("C:\\Users"));
        forbidden.push(PathBuf::from("C:\\ProgramData"));
    }
    #[cfg(not(target_os = "windows"))]
    {
        forbidden.push(PathBuf::from("/"));
        forbidden.push(PathBuf::from("/home"));
        forbidden.push(PathBuf::from("/usr"));
        forbidden.push(PathBuf::from("/etc"));
        forbidden.push(PathBuf::from("/boot"));
        forbidden.push(PathBuf::from("/var"));
        forbidden.push(PathBuf::from("/root"));
        forbidden.push(PathBuf::from("/opt"));
        forbidden.push(PathBuf::from("/proc"));
        forbidden.push(PathBuf::from("/sys"));
    }

    if canonical.parent().is_none() {
        return Err("Refusing to operate on a filesystem root.".to_string());
    }
    if forbidden.iter().any(|root| &canonical == root) {
        return Err("Refusing to operate on a protected system or home directory.".to_string());
    }

    Ok(canonical)
}

/// Moves every given path to the OS trash/recycle bin, independently and
/// best-effort (one locked or already-gone path doesn't abort the rest).
/// Returns a human-readable summary plus the count actually cleared.
pub fn move_paths_to_trash(paths: &[String]) -> (usize, String) {
    if paths.is_empty() {
        return (0, "Nothing to clear.".to_string());
    }

    let mut cleared = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for raw in paths {
        match harden_path(raw) {
            Ok(target) => match trash::delete(&target) {
                Ok(()) => cleared += 1,
                Err(e) => errors.push(format!("{}: {e}", target.display())),
            },
            Err(e) => errors.push(format!("{raw}: {e}")),
        }
    }

    let summary = if errors.is_empty() {
        format!("Cleared {cleared} item(s).")
    } else if cleared > 0 {
        format!(
            "Cleared {cleared} of {} item(s); some are likely still open in the browser: {}",
            paths.len(),
            errors.join("; ")
        )
    } else {
        format!("Couldn't clear any of it: {}", errors.join("; "))
    };

    (cleared, summary)
}
