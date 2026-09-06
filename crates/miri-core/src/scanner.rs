use crate::models::{CleanTarget, OsType, ScanResult, SystemInfo};
use crate::rules::RuleEngine;
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct Scanner;

impl Scanner {
    pub fn get_system_info() -> SystemInfo {
        let os = OsType::current();
        let os_name = match os {
            OsType::Linux => {
                if let Ok(release) = fs::read_to_string("/etc/os-release") {
                    let mut pretty = "Linux".to_string();
                    for line in release.lines() {
                        if line.starts_with("PRETTY_NAME=") {
                            pretty = line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string();
                        }
                    }
                    pretty
                } else {
                    "Linux (Generic)".to_string()
                }
            }
            OsType::Windows => "Windows 10/11".to_string(),
            OsType::MacOS => "macOS".to_string(),
            OsType::Unknown => "Unknown OS".to_string(),
        };

        let kernel_version = if os == OsType::Linux {
            std::process::Command::new("uname")
                .arg("-r")
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_else(|_| "Unknown".to_string())
        } else {
            "N/A".to_string()
        };

        let hostname = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "localhost".to_string());

        let is_elevated = crate::elevation::is_elevated();

        // Disk space estimation
        let (total_disk_space, free_disk_space) = Self::get_disk_space_stats();

        SystemInfo {
            os,
            os_name,
            kernel_version,
            hostname,
            is_elevated,
            total_disk_space,
            free_disk_space,
        }
    }

    #[cfg(target_os = "linux")]
    fn get_disk_space_stats() -> (u64, u64) {
        if let Ok(output) = std::process::Command::new("df").arg("-B1").arg("/").output() {
            let s = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = s.lines().nth(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let total = parts[1].parse::<u64>().unwrap_or(0);
                    let free = parts[3].parse::<u64>().unwrap_or(0);
                    return (total, free);
                }
            }
        }
        (100 * 1024 * 1024 * 1024, 40 * 1024 * 1024 * 1024)
    }

    #[cfg(not(target_os = "linux"))]
    fn get_disk_space_stats() -> (u64, u64) {
        (512 * 1024 * 1024 * 1024, 256 * 1024 * 1024 * 1024)
    }

    /// Perform a full non-destructive inspection across all default targets.
    pub fn scan_all() -> ScanResult {
        let system_info = Self::get_system_info();
        let mut targets = RuleEngine::get_default_targets(system_info.os);

        let mut total_reclaimable_bytes = 0;
        let mut total_files = 0;
        let mut total_locked = 0;

        for target in &mut targets {
            Self::inspect_target(target);
            total_reclaimable_bytes += target.estimated_bytes;
            total_files += target.file_count;
            total_locked += target.locked_count;
        }

        ScanResult {
            timestamp: Utc::now().to_rfc3339(),
            system_info,
            targets,
            total_reclaimable_bytes,
            total_files,
            total_locked,
        }
    }

    /// Inspects an individual target non-destructively:
    /// walks paths, checks symlink boundaries, checks file locks, and aggregates metrics.
    pub fn inspect_target(target: &mut CleanTarget) {
        let mut total_bytes = 0u64;
        let mut count = 0usize;
        let mut locked = 0usize;

        for path_pattern in &target.paths {
            let expanded_paths = Self::resolve_glob_or_path(path_pattern);

            for base_path in expanded_paths {
                if !base_path.exists() {
                    continue;
                }

                // Never recurse into blocked system paths
                if RuleEngine::is_path_blocked(&base_path) {
                    continue;
                }

                if base_path.is_file() {
                    if let Ok(meta) = base_path.metadata() {
                        total_bytes += meta.len();
                        count += 1;
                        if Self::is_file_locked(&base_path) {
                            locked += 1;
                        }
                    }
                    continue;
                }

                // If it is a symlink directory, do not follow out of bounds
                if RuleEngine::is_symlink_or_reparse(&base_path) {
                    continue;
                }

                for entry in WalkDir::new(&base_path)
                    .follow_links(false)
                    .max_depth(10)
                    .into_iter()
                    .filter_entry(|e| !RuleEngine::is_path_blocked(e.path()))
                    .filter_map(|e| e.ok())
                {
                    let p = entry.path();
                    if p.is_file() {
                        if let Ok(meta) = entry.metadata() {
                            total_bytes += meta.len();
                            count += 1;
                            if Self::is_file_locked(p) {
                                locked += 1;
                            }
                        }
                    }
                }
            }
        }

        target.estimated_bytes = total_bytes;
        target.file_count = count;
        target.locked_count = locked;
    }

    /// Resolves simple path patterns or globs
    fn resolve_glob_or_path(pattern: &str) -> Vec<PathBuf> {
        let path = PathBuf::from(pattern);
        if path.exists() {
            return vec![path];
        }

        // Handle simple single-wildcard patterns e.g. /boot/vmlinuz-* or ~/.var/app/*/cache
        if pattern.contains('*') {
            let parts: Vec<&str> = pattern.split('*').collect();
            if parts.len() == 2 {
                let prefix = Path::new(parts[0]);
                let suffix = parts[1];
                if let Some(parent) = prefix.parent() {
                    if parent.exists() {
                        let mut matches = Vec::new();
                        if let Ok(entries) = fs::read_dir(parent) {
                            for entry in entries.filter_map(|e| e.ok()) {
                                let p = entry.path();
                                let s = p.to_string_lossy();
                                if s.starts_with(parts[0]) && s.ends_with(suffix) {
                                    matches.push(p);
                                }
                            }
                        }
                        return matches;
                    }
                }
            }
        }

        vec![]
    }

    /// Check if a file is currently locked by another process
    pub fn is_file_locked(path: &Path) -> bool {
        #[cfg(target_os = "linux")]
        {
            // On Linux, test if opening file with write mode succeeds
            // (or check if another process holds an exclusive lock)
            if let Ok(f) = fs::OpenOptions::new().write(true).open(path) {
                drop(f);
                false
            } else {
                // Could be read-only permission or process lock
                true
            }
        }
        #[cfg(target_os = "windows")]
        {
            // On Windows, sharing violations occur if open with exclusive write
            if let Ok(f) = fs::OpenOptions::new().write(true).open(path) {
                drop(f);
                false
            } else {
                true
            }
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows")))]
        {
            false
        }
    }
}
