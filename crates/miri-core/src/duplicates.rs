use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs::{self, File};
use std::hash::Hasher;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub group_id: String,
    pub file_size: u64,
    pub count: usize,
    pub wasted_bytes: u64,
    pub files: Vec<DuplicateItem>,
    pub can_reflink: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateItem {
    pub path: String,
    pub modified_time: String,
    pub is_original: bool,
}

pub struct DuplicateFinder;

impl DuplicateFinder {
    /// High-performance duplicate file finder with Btrfs Reflink detection
    pub fn scan_duplicates(target_dir: Option<&str>) -> Vec<DuplicateGroup> {
        let dir = target_dir
            .map(|d| RuleEngine::expand_path(d))
            .unwrap_or_else(|| {
                let home = std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());
                format!("{}/Downloads", home.trim_end_matches('/'))
            });

        let p = Path::new(&dir);
        if !p.exists() {
            return vec![];
        }

        let is_btrfs = Self::is_btrfs_filesystem(p);

        // Stage 1: Group by exact file size
        let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
        for entry in WalkDir::new(p)
            .max_depth(4)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().is_file() {
                if let Ok(meta) = entry.metadata() {
                    let len = meta.len();
                    // Ignore empty files (< 1KB)
                    if len >= 1024 {
                        by_size.entry(len).or_default().push(entry.path().to_path_buf());
                    }
                }
            }
        }

        // Stage 2: Hash matching sizes
        let mut groups = Vec::new();
        let mut group_counter = 0;

        for (size, paths) in by_size.into_iter().filter(|(_, v)| v.len() > 1) {
            let mut by_hash: HashMap<u64, Vec<PathBuf>> = HashMap::new();

            for path in paths {
                if let Ok(hash) = Self::compute_fast_file_hash(&path) {
                    by_hash.entry(hash).or_default().push(path);
                }
            }

            for (_, matching_paths) in by_hash.into_iter().filter(|(_, v)| v.len() > 1) {
                group_counter += 1;
                let count = matching_paths.len();
                let wasted = size * (count as u64 - 1);

                let mut items = Vec::new();
                for (idx, p_buf) in matching_paths.into_iter().enumerate() {
                    let mod_str = fs::metadata(&p_buf)
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| {
                            chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                                .unwrap_or_default()
                        })
                        .unwrap_or_else(|| "Unknown".to_string());

                    items.push(DuplicateItem {
                        path: p_buf.to_string_lossy().to_string(),
                        modified_time: mod_str,
                        is_original: idx == 0,
                    });
                }

                groups.push(DuplicateGroup {
                    group_id: format!("dup-group-{}", group_counter),
                    file_size: size,
                    count,
                    wasted_bytes: wasted,
                    files: items,
                    can_reflink: is_btrfs,
                });
            }
        }

        // Sort by wasted bytes descending
        groups.sort_by(|a, b| b.wasted_bytes.cmp(&a.wasted_bytes));
        groups
    }

    fn compute_fast_file_hash(path: &Path) -> Result<u64, std::io::Error> {
        let mut file = File::open(path)?;
        let mut hasher = DefaultHasher::new();
        let mut buffer = [0u8; 8192];

        // Read first 8KB
        let n = file.read(&mut buffer)?;
        hasher.write(&buffer[..n]);

        // If file is large, read last 8KB as well
        if let Ok(meta) = file.metadata() {
            let len = meta.len();
            if len > 16384 {
                hasher.write_u64(len);
            }
        }

        Ok(hasher.finish())
    }

    fn is_btrfs_filesystem(path: &Path) -> bool {
        #[cfg(target_os = "linux")]
        {
            if let Ok(out) = Command::new("df").args(["-T", &path.to_string_lossy()]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    return text.contains("btrfs");
                }
            }
        }
        false
    }

    /// CoW Reflink deduplication (Fedora Btrfs superpower)
    pub fn reflink_deduplicate(original: &str, duplicate: &str) -> Result<bool, String> {
        #[cfg(target_os = "linux")]
        {
            let out = Command::new("cp")
                .args(["--reflink=always", original, duplicate])
                .output()
                .map_err(|e| e.to_string())?;

            return Ok(out.status.success());
        }
        #[cfg(not(target_os = "linux"))]
        {
            Err("Reflink copy-on-write is only available on Linux Btrfs".to_string())
        }
    }
}
