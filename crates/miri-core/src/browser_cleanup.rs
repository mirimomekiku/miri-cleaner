//! Per-browser, per-data-type storage breakdown. The main scanner lumps
//! every browser into one "Web Browser Caches" target; this walks each
//! installed browser's profile directory separately so a user can see (and
//! selectively clear) cache vs. cookies vs. site storage instead of an
//! all-or-nothing blob.
//!
//! Deletion itself deliberately isn't implemented here -- the Tauri layer's
//! `fs_ops::clear_browser_data` handles that with the OS trash, the same
//! hardening contract as the rest of the Storage & Duplicates context menu.
//! This module is read-only.

use crate::models::OsType;
use crate::rules::RuleEngine;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct BrowserDataCategory {
    /// "cache" | "cookies" | "local_storage" | "indexeddb" | "service_worker" | "site_storage"
    pub key: String,
    pub label: String,
    pub description: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub paths: Vec<String>,
    /// Cookies/history are still user-clearable, but flagged so the UI can
    /// warn that clearing them logs the user out of sites, unlike cache.
    pub safe_to_clear: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowserProfile {
    pub browser_id: String,
    pub browser_name: String,
    pub profile_name: String,
    pub categories: Vec<BrowserDataCategory>,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowserCleanupReport {
    pub browsers: Vec<BrowserProfile>,
    pub total_bytes: u64,
}

struct ChromiumBrowser {
    id: &'static str,
    name: &'static str,
    /// Root "User Data"-equivalent directory, already OS-specific.
    root: Option<PathBuf>,
}

pub struct BrowserCleanupScanner;

impl BrowserCleanupScanner {
    pub fn scan() -> BrowserCleanupReport {
        let mut browsers = Vec::new();

        for chromium in Self::chromium_roots() {
            let Some(root) = chromium.root else { continue };
            if !root.is_dir() {
                continue;
            }
            for profile_dir in Self::chromium_profile_dirs(&root) {
                let profile_name =
                    profile_dir.file_name().unwrap_or_default().to_string_lossy().to_string();
                let categories = Self::chromium_categories(&profile_dir);
                let total_bytes = categories.iter().map(|c| c.size_bytes).sum();
                if total_bytes == 0 {
                    continue;
                }
                browsers.push(BrowserProfile {
                    browser_id: chromium.id.to_string(),
                    browser_name: chromium.name.to_string(),
                    profile_name,
                    categories,
                    total_bytes,
                });
            }
        }

        for profile_dir in Self::firefox_profile_dirs() {
            let profile_name =
                profile_dir.file_name().unwrap_or_default().to_string_lossy().to_string();
            let categories = Self::firefox_categories(&profile_dir);
            let total_bytes = categories.iter().map(|c| c.size_bytes).sum();
            if total_bytes == 0 {
                continue;
            }
            browsers.push(BrowserProfile {
                browser_id: "firefox".to_string(),
                browser_name: "Mozilla Firefox".to_string(),
                profile_name,
                categories,
                total_bytes,
            });
        }

        let total_bytes = browsers.iter().map(|b| b.total_bytes).sum();
        BrowserCleanupReport { browsers, total_bytes }
    }

    fn local_appdata() -> Option<PathBuf> {
        std::env::var("LOCALAPPDATA").ok().map(PathBuf::from)
    }

    fn appdata_roaming() -> Option<PathBuf> {
        std::env::var("APPDATA").ok().map(PathBuf::from)
    }

    fn chromium_roots() -> Vec<ChromiumBrowser> {
        let os = OsType::current();
        match os {
            OsType::Linux => {
                let home = RuleEngine::home_dir();
                vec![
                    ChromiumBrowser {
                        id: "chrome",
                        name: "Google Chrome",
                        root: home.as_ref().map(|h| h.join(".config/google-chrome")),
                    },
                    ChromiumBrowser {
                        id: "chromium",
                        name: "Chromium",
                        root: home.as_ref().map(|h| h.join(".config/chromium")),
                    },
                    ChromiumBrowser {
                        id: "edge",
                        name: "Microsoft Edge",
                        root: home.as_ref().map(|h| h.join(".config/microsoft-edge")),
                    },
                    ChromiumBrowser {
                        id: "brave",
                        name: "Brave",
                        root: home.as_ref().map(|h| h.join(".config/BraveSoftware/Brave-Browser")),
                    },
                ]
            }
            OsType::Windows => {
                let local = Self::local_appdata();
                vec![
                    ChromiumBrowser {
                        id: "chrome",
                        name: "Google Chrome",
                        root: local.as_ref().map(|l| l.join("Google/Chrome/User Data")),
                    },
                    ChromiumBrowser {
                        id: "edge",
                        name: "Microsoft Edge",
                        root: local.as_ref().map(|l| l.join("Microsoft/Edge/User Data")),
                    },
                    ChromiumBrowser {
                        id: "brave",
                        name: "Brave",
                        root: local
                            .as_ref()
                            .map(|l| l.join("BraveSoftware/Brave-Browser/User Data")),
                    },
                ]
            }
            _ => vec![],
        }
    }

    /// Chromium profile directories are named "Default" or "Profile N"
    /// inside the browser's "User Data" root.
    fn chromium_profile_dirs(root: &Path) -> Vec<PathBuf> {
        let mut dirs = Vec::new();
        let Ok(entries) = fs::read_dir(root) else { return dirs };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name == "Default" || name.starts_with("Profile ") {
                dirs.push(path);
            }
        }
        dirs
    }

    fn firefox_profile_dirs() -> Vec<PathBuf> {
        let os = OsType::current();
        let root = match os {
            OsType::Linux => RuleEngine::home_dir().map(|h| h.join(".mozilla/firefox")),
            OsType::Windows => Self::appdata_roaming().map(|a| a.join("Mozilla/Firefox/Profiles")),
            _ => None,
        };
        let mut dirs = Vec::new();
        let Some(root) = root else { return dirs };
        let Ok(entries) = fs::read_dir(&root) else { return dirs };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                dirs.push(path);
            }
        }
        dirs
    }

    /// On Windows, Firefox splits a profile across two roots: the profile
    /// itself (prefs, cookies, storage) lives under Roaming AppData, but
    /// its cache lives in a separate mirror under Local AppData. On Linux
    /// both live under the same `~/.mozilla/firefox/<profile>` directory.
    fn firefox_cache_dir(profile_dir: &Path) -> Option<PathBuf> {
        let cache2 = profile_dir.join("cache2");
        if cache2.exists() {
            return Some(cache2);
        }
        #[cfg(target_os = "windows")]
        {
            if let Some(local) = Self::local_appdata() {
                let name = profile_dir.file_name()?.to_string_lossy().to_string();
                let mirrored = local.join("Mozilla/Firefox/Profiles").join(name).join("cache2");
                if mirrored.exists() {
                    return Some(mirrored);
                }
            }
        }
        None
    }

    fn dir_size(path: &Path) -> (u64, u64) {
        if !path.exists() {
            return (0, 0);
        }
        if path.is_file() {
            return (fs::metadata(path).map(|m| m.len()).unwrap_or(0), 1);
        }
        let mut bytes = 0u64;
        let mut count = 0u64;
        for entry in WalkDir::new(path).follow_links(false).into_iter().filter_map(|e| e.ok()) {
            if entry.path().is_file() {
                if let Ok(meta) = entry.metadata() {
                    bytes += meta.len();
                    count += 1;
                }
            }
        }
        (bytes, count)
    }

    fn category_from_paths(
        key: &str,
        label: &str,
        description: &str,
        paths: Vec<PathBuf>,
        safe_to_clear: bool,
    ) -> BrowserDataCategory {
        let mut size_bytes = 0u64;
        let mut file_count = 0u64;
        let mut existing_paths = Vec::new();
        for p in &paths {
            if !p.exists() {
                continue;
            }
            let (bytes, count) = Self::dir_size(p);
            size_bytes += bytes;
            file_count += count;
            existing_paths.push(p.to_string_lossy().to_string());
        }
        BrowserDataCategory {
            key: key.to_string(),
            label: label.to_string(),
            description: description.to_string(),
            size_bytes,
            file_count,
            paths: existing_paths,
            safe_to_clear,
        }
    }

    fn chromium_categories(profile_dir: &Path) -> Vec<BrowserDataCategory> {
        vec![
            Self::category_from_paths(
                "cache",
                "Cache",
                "Temporary copies of pages, scripts, and images so sites load faster. Always safe to clear.",
                vec![profile_dir.join("Cache"), profile_dir.join("Code Cache"), profile_dir.join("GPUCache")],
                true,
            ),
            Self::category_from_paths(
                "cookies",
                "Cookies",
                "Keeps you signed in to sites. Clearing this logs you out everywhere.",
                vec![profile_dir.join("Cookies"), profile_dir.join("Network/Cookies")],
                false,
            ),
            Self::category_from_paths(
                "local_storage",
                "Local Storage",
                "Small pieces of data sites save in your browser (preferences, drafts, cart contents).",
                vec![profile_dir.join("Local Storage/leveldb")],
                true,
            ),
            Self::category_from_paths(
                "indexeddb",
                "IndexedDB",
                "A larger, database-like storage some web apps use to work offline.",
                vec![profile_dir.join("IndexedDB")],
                true,
            ),
            Self::category_from_paths(
                "service_worker",
                "Service Worker Storage",
                "Offline-app files and background sync data registered by websites.",
                vec![profile_dir.join("Service Worker")],
                true,
            ),
        ]
    }

    fn firefox_categories(profile_dir: &Path) -> Vec<BrowserDataCategory> {
        let cache_dir = Self::firefox_cache_dir(profile_dir);
        vec![
            Self::category_from_paths(
                "cache",
                "Cache",
                "Temporary copies of pages, scripts, and images so sites load faster. Always safe to clear.",
                cache_dir.into_iter().collect(),
                true,
            ),
            Self::category_from_paths(
                "cookies",
                "Cookies",
                "Keeps you signed in to sites. Clearing this logs you out everywhere.",
                vec![profile_dir.join("cookies.sqlite")],
                false,
            ),
            Self::category_from_paths(
                "site_storage",
                "Site Storage",
                "Local storage, IndexedDB, and offline app data websites saved in your browser, combined.",
                vec![profile_dir.join("storage/default")],
                true,
            ),
        ]
    }
}
