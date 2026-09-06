use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppLeftover {
    pub id: String,
    pub app_name: String,
    pub paths: Vec<String>,
    pub total_bytes: u64,
    pub file_count: u64,
    pub source: String,
    pub risk_level: String,
    pub is_removable: bool,
}

pub struct LeftoversScanner;

impl LeftoversScanner {
    /// Scans for leftover application configurations and cache stores
    /// belonging to uninstalled packages (Flatpak, RPM, and Windows).
    pub fn scan_leftovers() -> Vec<AppLeftover> {
        let mut results = Vec::new();

        // 1. Linux Flatpak leftovers (~/.var/app)
        #[cfg(target_os = "linux")]
        {
            let installed_flatpaks = Self::get_installed_flatpaks();
            let var_app_str = RuleEngine::expand_path("~/.var/app");
            let var_app = Path::new(&var_app_str);

            if var_app.exists() {
                if let Ok(entries) = fs::read_dir(var_app) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        if path.is_dir() {
                            let dir_name = path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();

                            // Skip hidden or system folders
                            if dir_name.starts_with('.') {
                                continue;
                            }

                            // If this app ID is NOT currently installed via Flatpak, it's a leftover!
                            if !installed_flatpaks.contains(&dir_name) {
                                let (bytes, count) = Self::dir_footprint(&path);
                                results.push(AppLeftover {
                                    id: format!("flatpak-{}", dir_name),
                                    app_name: format!("{} (Flatpak Orphan)", dir_name),
                                    paths: vec![path.to_string_lossy().to_string()],
                                    total_bytes: bytes,
                                    file_count: count,
                                    source: "flatpak_orphan".to_string(),
                                    risk_level: "safe".to_string(),
                                    is_removable: true,
                                });
                            }
                        }
                    }
                }
            }
        }

        // 2. Windows orphaned app stores
        #[cfg(target_os = "windows")]
        {
            let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
            let appdata = std::env::var("APPDATA").unwrap_or_default();

            // Known leftover locations from common uninstalled apps
            let candidates = [
                (format!("{}\\Temp", local), "Windows Temp Leftovers"),
                (format!("{}\\CrashDumps", local), "Crash Dump Leftovers"),
            ];

            for (p_str, name) in &candidates {
                let p = Path::new(p_str);
                if p.exists() {
                    let (bytes, count) = Self::dir_footprint(p);
                    if bytes > 0 {
                        results.push(AppLeftover {
                            id: format!("win-leftover-{}", name.replace(' ', "-").to_lowercase()),
                            app_name: name.to_string(),
                            paths: vec![p_str.clone()],
                            total_bytes: bytes,
                            file_count: count,
                            source: "windows_orphan".to_string(),
                            risk_level: "safe".to_string(),
                            is_removable: true,
                        });
                    }
                }
            }
        }

        results
    }

    fn get_installed_flatpaks() -> HashSet<String> {
        let mut set = HashSet::new();
        if let Ok(out) = Command::new("flatpak")
            .args(["list", "--app", "--columns=application"])
            .output()
        {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        set.insert(trimmed.to_string());
                    }
                }
            }
        }
        set
    }

    fn dir_footprint(path: &Path) -> (u64, u64) {
        let mut bytes = 0u64;
        let mut count = 0u64;

        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            if entry.path().is_file() {
                if let Ok(meta) = entry.metadata() {
                    bytes += meta.len();
                    count += 1;
                }
            }
        }
        (bytes, count)
    }

    pub fn delete_leftover(paths: &[String]) -> Result<u64, String> {
        let mut freed = 0u64;
        for path_str in paths {
            let p = Path::new(path_str);
            if !p.exists() {
                continue;
            }
            if RuleEngine::is_path_blocked(p) {
                return Err(format!("Path is blocked: {}", path_str));
            }
            let (bytes, _) = Self::dir_footprint(p);
            if fs::remove_dir_all(p).is_ok() {
                freed += bytes;
            }
        }
        Ok(freed)
    }
}
