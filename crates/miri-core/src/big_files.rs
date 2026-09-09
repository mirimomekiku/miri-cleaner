//! Filtered big-file finder: unlike `xray::SpaceXRay`'s "largest 30 files
//! over 1MB" snapshot (built for the storage breakdown overview), this
//! walks with an explicit, user-controlled query -- size threshold,
//! category, and age/last-opened filters -- and reports every match up to
//! a bounded limit.

use crate::rules::RuleEngine;
use crate::xray::SpaceXRay;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(default)]
pub struct BigFileQuery {
    pub root_path: Option<String>,
    pub min_size_bytes: Option<u64>,
    /// Category keys as produced by `SpaceXRay::categorize_file` (e.g.
    /// "video", "archives_installers"). Empty/absent means "all categories".
    pub categories: Option<Vec<String>>,
    /// Keep only files last modified at least this many days ago.
    pub modified_before_days: Option<u32>,
    /// Keep only files last modified within this many days.
    pub modified_within_days: Option<u32>,
    /// Keep only files whose access time is at least this many days ago.
    /// Files where access time can't be determined are never excluded by
    /// this filter (see `access_time_note` for why it may be unreliable).
    pub unopened_for_days: Option<u32>,
    /// "size" (default), "oldest_modified", or "oldest_accessed".
    pub sort_by: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BigFileItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub category: String,
    pub modified_time: String,
    pub modified_days_ago: i64,
    pub accessed_time: Option<String>,
    pub accessed_days_ago: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BigFileReport {
    pub root_path: String,
    /// Total matches before `limit` truncated the returned list.
    pub total_matched: usize,
    pub total_matched_bytes: u64,
    pub files: Vec<BigFileItem>,
    /// Set when access-time filtering on this root is known to be
    /// unreliable (Windows doesn't track it by default; some Linux mounts
    /// use `noatime`), so the UI can caveat the "unopened for" filter
    /// instead of presenting it as exact.
    pub access_time_note: Option<String>,
}

pub struct BigFileFinder;

impl BigFileFinder {
    pub fn find(query: BigFileQuery) -> BigFileReport {
        let root = query.root_path.as_deref().map(RuleEngine::expand_path).unwrap_or_else(|| {
            RuleEngine::home_dir()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|| ".".to_string())
        });
        let root_p = PathBuf::from(&root);
        let access_time_note = Self::access_time_caveat(&root_p);

        if !root_p.exists() {
            return BigFileReport {
                root_path: root,
                total_matched: 0,
                total_matched_bytes: 0,
                files: vec![],
                access_time_note,
            };
        }

        let min_size = query.min_size_bytes.unwrap_or(50 * 1024 * 1024);
        let categories: Option<HashSet<String>> =
            query.categories.filter(|c| !c.is_empty()).map(|c| c.into_iter().collect());
        let limit = query.limit.unwrap_or(100).min(500);
        let now = Utc::now();

        let mut matches: Vec<BigFileItem> = Vec::new();

        for entry in WalkDir::new(&root_p)
            .max_depth(12)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| !RuleEngine::is_path_blocked(e.path()))
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Ok(meta) = entry.metadata() else {
                continue;
            };
            let size = meta.len();
            if size < min_size {
                continue;
            }

            let category = SpaceXRay::categorize_file(path);
            if let Some(cats) = &categories {
                if !cats.contains(&category) {
                    continue;
                }
            }

            let modified_dt = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0));
            let modified_days_ago = modified_dt.map(|dt| (now - dt).num_days()).unwrap_or(0);

            if let Some(min_age) = query.modified_before_days {
                if modified_days_ago < min_age as i64 {
                    continue;
                }
            }
            if let Some(max_age) = query.modified_within_days {
                if modified_days_ago > max_age as i64 {
                    continue;
                }
            }

            let accessed_dt = meta
                .accessed()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0));
            let accessed_days_ago = accessed_dt.map(|dt| (now - dt).num_days());

            if let Some(min_unopened) = query.unopened_for_days {
                if let Some(days) = accessed_days_ago {
                    if days < min_unopened as i64 {
                        continue;
                    }
                }
                // Unknown access time never excludes a match -- we'd rather
                // over-include than silently hide a file we can't verify.
            }

            matches.push(BigFileItem {
                name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                size_bytes: size,
                category,
                modified_time: modified_dt
                    .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                modified_days_ago,
                accessed_time: accessed_dt.map(|dt| dt.format("%Y-%m-%d %H:%M").to_string()),
                accessed_days_ago,
            });
        }

        match query.sort_by.as_deref() {
            Some("oldest_modified") => {
                matches.sort_by(|a, b| b.modified_days_ago.cmp(&a.modified_days_ago))
            }
            Some("oldest_accessed") => matches.sort_by(|a, b| {
                b.accessed_days_ago.unwrap_or(0).cmp(&a.accessed_days_ago.unwrap_or(0))
            }),
            _ => matches.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes)),
        }

        let total_matched = matches.len();
        let total_matched_bytes: u64 = matches.iter().map(|f| f.size_bytes).sum();
        matches.truncate(limit);

        BigFileReport {
            root_path: root,
            total_matched,
            total_matched_bytes,
            files: matches,
            access_time_note,
        }
    }

    fn access_time_caveat(root: &Path) -> Option<String> {
        #[cfg(target_os = "windows")]
        {
            let _ = root;
            return Some(
                "Windows doesn't track file access time by default, so \"last opened\" may reflect creation time instead.".to_string(),
            );
        }
        #[cfg(target_os = "linux")]
        {
            if let Ok(mounts) = std::fs::read_to_string("/proc/mounts") {
                let root_str = root.to_string_lossy();
                let mut best: Option<(String, String)> = None;
                for line in mounts.lines() {
                    let cols: Vec<&str> = line.split_whitespace().collect();
                    if cols.len() < 4 {
                        continue;
                    }
                    let mount_point = cols[1];
                    if root_str.starts_with(mount_point)
                        && best.as_ref().map(|(mp, _)| mount_point.len() > mp.len()).unwrap_or(true)
                    {
                        best = Some((mount_point.to_string(), cols[3].to_string()));
                    }
                }
                if let Some((_, opts)) = best {
                    if opts.split(',').any(|o| o == "noatime") {
                        return Some(
                            "This drive is mounted with noatime, so \"last opened\" times aren't tracked and fall back to last modified.".to_string(),
                        );
                    }
                }
            }
            None
        }
        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        {
            let _ = root;
            None
        }
    }
}
