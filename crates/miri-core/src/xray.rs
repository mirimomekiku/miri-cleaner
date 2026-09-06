use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRayReport {
    pub root_path: String,
    pub total_scanned_bytes: u64,
    pub total_files: u64,
    pub by_category: HashMap<String, u64>,
    pub top_folders: Vec<XRayFolderNode>,
    pub largest_files: Vec<XRayFileItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRayFolderNode {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRayFileItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub category: String,
    pub modified_time: String,
}

pub struct SpaceXRay;

impl SpaceXRay {
    pub fn scan_path(target_path: Option<&str>) -> XRayReport {
        let root = target_path
            .map(|p| RuleEngine::expand_path(p))
            .unwrap_or_else(|| {
                std::env::var("HOME")
                    .or_else(|_| std::env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string())
            });

        let mut total_bytes = 0u64;
        let mut total_files = 0u64;
        let mut by_category: HashMap<String, u64> = HashMap::new();
        let mut folder_sizes: HashMap<PathBuf, (u64, u64)> = HashMap::new();
        let mut all_files: Vec<XRayFileItem> = Vec::new();

        let root_p = Path::new(&root);
        if !root_p.exists() {
            return XRayReport {
                root_path: root,
                total_scanned_bytes: 0,
                total_files: 0,
                by_category,
                top_folders: vec![],
                largest_files: vec![],
            };
        }

        // Limit depth to 4 to balance performance and granularity
        for entry in WalkDir::new(root_p)
            .max_depth(4)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if RuleEngine::is_path_blocked(path) {
                continue;
            }

            if path.is_file() {
                if let Ok(meta) = entry.metadata() {
                    let size = meta.len();
                    total_bytes += size;
                    total_files += 1;

                    let cat = Self::categorize_file(path);
                    *by_category.entry(cat.clone()).or_insert(0) += size;

                    // Track immediate parent and grandparent folders
                    if let Some(parent) = path.parent() {
                        let e = folder_sizes.entry(parent.to_path_buf()).or_insert((0, 0));
                        e.0 += size;
                        e.1 += 1;
                    }

                    // Keep files larger than 1MB for largest files list
                    if size >= 1024 * 1024 {
                        let mod_time = meta
                            .modified()
                            .ok()
                            .and_then(|t| {
                                t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| {
                                    chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                                        .unwrap_or_default()
                                })
                            })
                            .unwrap_or_else(|| "Unknown".to_string());

                        all_files.push(XRayFileItem {
                            name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                            path: path.to_string_lossy().to_string(),
                            size_bytes: size,
                            category: cat,
                            modified_time: mod_time,
                        });
                    }
                }
            }
        }

        // Sort largest files descending, take top 30
        all_files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        all_files.truncate(30);

        // Process top folders
        let mut top_folders: Vec<XRayFolderNode> = folder_sizes
            .into_iter()
            .filter(|(p, _)| p != root_p)
            .map(|(p, (size, count))| {
                let pct = if total_bytes > 0 {
                    (size as f64 / total_bytes as f64) * 100.0
                } else {
                    0.0
                };
                XRayFolderNode {
                    name: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    path: p.to_string_lossy().to_string(),
                    size_bytes: size,
                    file_count: count,
                    percentage: (pct * 10.0).round() / 10.0,
                }
            })
            .collect();

        top_folders.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        top_folders.truncate(15);

        XRayReport {
            root_path: root,
            total_scanned_bytes: total_bytes,
            total_files,
            by_category,
            top_folders,
            largest_files: all_files,
        }
    }

    fn categorize_file(path: &Path) -> String {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let path_str = path.to_string_lossy().to_lowercase();
        if path_str.contains("node_modules")
            || path_str.contains("/target/")
            || path_str.contains("\\target\\")
            || path_str.contains(".venv")
            || path_str.contains("__pycache__")
            || path_str.contains(".gradle")
            || path_str.contains(".m2")
        {
            return "build_cache".to_string();
        }

        match ext.as_str() {
            "mp4" | "mkv" | "avi" | "mov" | "webm" | "flv" => "video".to_string(),
            "zip" | "tar" | "gz" | "xz" | "7z" | "iso" | "rpm" | "deb" | "exe" | "msi" => {
                "archives_installers".to_string()
            }
            "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" | "bmp" => "images".to_string(),
            "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => "audio".to_string(),
            "pdf" | "docx" | "doc" | "xlsx" | "pptx" | "txt" | "md" => "documents".to_string(),
            _ => "other".to_string(),
        }
    }
}
