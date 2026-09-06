use crate::models::{CleanCategory, CleanTarget, OsType, RiskLevel};
use std::env;
use std::path::Path;

pub struct RuleEngine;

impl RuleEngine {
    /// Returns the built-in clean targets tailored for the current OS.
    pub fn get_default_targets(os: OsType) -> Vec<CleanTarget> {
        let mut targets = Vec::new();

        match os {
            OsType::Linux => {
                // Fedora / Linux targets
                targets.push(CleanTarget {
                    id: "fedora-dnf-cache".to_string(),
                    name: "DNF / DNF5 Package Cache".to_string(),
                    description: "Removes cached RPM metadata, downloaded headers, and temp database files.".to_string(),
                    category: CleanCategory::PackageManagers,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: true,
                    paths: vec![
                        "/var/cache/dnf".to_string(),
                        "/var/cache/libdnf5".to_string(),
                    ],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "systemd-journal".to_string(),
                    name: "Systemd Journal Logs (>7 days)".to_string(),
                    description: "Vacuums archived journal logs older than 7 days and limits total log volume to 200MB.".to_string(),
                    category: CleanCategory::SystemLogs,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: true,
                    paths: vec!["/var/log/journal".to_string()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "flatpak-unused".to_string(),
                    name: "Flatpak Unused Runtimes & Cache".to_string(),
                    description: "Sweeps orphaned Flatpak runtimes and application cache stores in ~/.var/app.".to_string(),
                    category: CleanCategory::PackageManagers,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: false,
                    paths: vec![Self::expand_path("~/.var/app/*/cache")],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "linux-old-kernels".to_string(),
                    name: "Old / Unused Linux Kernels".to_string(),
                    description: "Prunes obsolete installed kernels while strictly preserving active running & N-1 fallback kernels.".to_string(),
                    category: CleanCategory::OldKernels,
                    risk_level: RiskLevel::Moderate,
                    requires_elevation: true,
                    paths: vec!["/boot/vmlinuz-*".to_string()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: false,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "linux-user-cache".to_string(),
                    name: "User Thumbnail & Application Caches".to_string(),
                    description: "Clears user thumbnail cache (~/.cache/thumbnails) and temporary desktop application caches.".to_string(),
                    category: CleanCategory::SystemTemp,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: false,
                    paths: vec![
                        Self::expand_path("~/.cache/thumbnails"),
                        Self::expand_path("~/.cache/media-art"),
                    ],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "linux-trash".to_string(),
                    name: "User Trash Bin".to_string(),
                    description: "Permanently purges files inside the desktop user trash folder (~/.local/share/Trash).".to_string(),
                    category: CleanCategory::UserTrash,
                    risk_level: RiskLevel::Moderate,
                    requires_elevation: false,
                    paths: vec![Self::expand_path("~/.local/share/Trash")],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: false,
                    is_removable: true,
                });
            }
            OsType::Windows => {
                // Windows 10/11 targets
                let temp = env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
                let local_appdata = env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());

                targets.push(CleanTarget {
                    id: "win-user-temp".to_string(),
                    name: "Windows User Temp Files".to_string(),
                    description: "Removes temporary files accumulated in user %TEMP% directory.".to_string(),
                    category: CleanCategory::SystemTemp,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: false,
                    paths: vec![temp.clone()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "win-system-temp".to_string(),
                    name: "Windows System Temp".to_string(),
                    description: "Clears unreferenced temporary files in C:\\Windows\\Temp.".to_string(),
                    category: CleanCategory::SystemTemp,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: true,
                    paths: vec!["C:\\Windows\\Temp".to_string()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "win-update-cache".to_string(),
                    name: "Windows Update Download Cache".to_string(),
                    description: "Cleans cached installation payloads in C:\\Windows\\SoftwareDistribution\\Download.".to_string(),
                    category: CleanCategory::WindowsUpdate,
                    risk_level: RiskLevel::Moderate,
                    requires_elevation: true,
                    paths: vec!["C:\\Windows\\SoftwareDistribution\\Download".to_string()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "win-prefetch".to_string(),
                    name: "Windows Prefetch Cache".to_string(),
                    description: "Cleans obsolete prefetch metadata from C:\\Windows\\Prefetch.".to_string(),
                    category: CleanCategory::SystemTemp,
                    risk_level: RiskLevel::Moderate,
                    requires_elevation: true,
                    paths: vec!["C:\\Windows\\Prefetch".to_string()],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: false,
                    is_removable: true,
                });

                targets.push(CleanTarget {
                    id: "win-crash-dumps".to_string(),
                    name: "Windows Crash Dumps & Error Reports".to_string(),
                    description: "Deletes minidumps, WER reports, and memory crash dumps.".to_string(),
                    category: CleanCategory::SystemLogs,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: false,
                    paths: vec![
                        format!("{}\\CrashDumps", local_appdata),
                        format!("{}\\Microsoft\\Windows\\WER", local_appdata),
                    ],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });
                targets.push(CleanTarget {
                    id: "win-winget-cache".to_string(),
                    name: "WinGet Package Manager Cache".to_string(),
                    description: "Cleans downloaded package installers in WinGet temporary cache directories.".to_string(),
                    category: CleanCategory::PackageManagers,
                    risk_level: RiskLevel::Safe,
                    requires_elevation: false,
                    paths: vec![
                        format!("{}\\Packages\\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\\LocalState", local_appdata),
                        format!("{}\\WinGet", temp),
                    ],
                    estimated_bytes: 0,
                    file_count: 0,
                    locked_count: 0,
                    enabled_by_default: true,
                    is_removable: true,
                });
            }
            _ => {}
        }

        // Cross-platform Browser caches
        targets.push(CleanTarget {
            id: "browser-caches".to_string(),
            name: "Web Browser Caches (Chrome, Edge, Firefox)".to_string(),
            description: "Clears temporary HTTP web caches while preserving cookies, bookmarks, and passwords.".to_string(),
            category: CleanCategory::BrowserCache,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: Self::get_browser_cache_paths(os),
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: true,
            is_removable: true,
        });

        // Developer Toolchain caches
        targets.push(CleanTarget {
            id: "dev-python-cache".to_string(),
            name: "Python Ecosystem (pip, uv, Poetry, Conda)".to_string(),
            description: "Cleans cached pip download wheels, uv packages, Poetry artifacts, and conda package archives.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/.cache/pip"),
                Self::expand_path("~/.cache/uv"),
                Self::expand_path("~/.cache/pypoetry"),
                Self::expand_path("~/.conda/pkgs"),
                Self::expand_path("~/miniconda3/pkgs"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets.push(CleanTarget {
            id: "dev-modern-js-cache".to_string(),
            name: "Modern JS Ecosystem (npm, pnpm, Yarn, Bun, Deno)".to_string(),
            description: "Prunes global npm cache, pnpm content-addressable store, Bun cache, and Deno runtime downloads.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/.npm/_cacache"),
                Self::expand_path("~/.local/share/pnpm/store"),
                Self::expand_path("~/.yarn/cache"),
                Self::expand_path("~/.bun/install/cache"),
                Self::expand_path("~/.cache/deno"),
                Self::expand_path("~/.cache/turbo"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets.push(CleanTarget {
            id: "dev-podman-cache".to_string(),
            name: "Containers & Podman Storage (Podman / Docker)".to_string(),
            description: "Prunes inactive Podman containers, temporary rootless storage overlays, and build layers.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/.local/share/containers/storage/tmp"),
                Self::expand_path("~/.local/share/containers/cache"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets.push(CleanTarget {
            id: "dev-compiler-cache".to_string(),
            name: "C / C++ / Rust Compilers (ccache, sccache, Cargo & Rustup)".to_string(),
            description: "Cleans pre-compiled C/C++ compilation caches (ccache/sccache), Rust crate tarballs, git indices, and Rustup toolchain downloads.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/.cache/ccache"),
                Self::expand_path("~/.cache/sccache"),
                Self::expand_path("~/.cargo/registry/cache"),
                Self::expand_path("~/.cargo/git/db"),
                Self::expand_path("~/.rustup/downloads"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets.push(CleanTarget {
            id: "dev-jvm-cache".to_string(),
            name: "JVM Build Systems (Maven, Gradle, sbt)".to_string(),
            description: "Sweeps cached Maven repository artifacts, Gradle build-cache payloads, and Coursier/sbt dependency jars.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/.m2/repository"),
                Self::expand_path("~/.gradle/caches"),
                Self::expand_path("~/.cache/coursier"),
                Self::expand_path("~/.sbt"),
                Self::expand_path("~/.android/build-cache"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets.push(CleanTarget {
            id: "dev-go-cache".to_string(),
            name: "Go Module & Build Cache".to_string(),
            description: "Cleans Go compiler build cache and cached module zip downloads.".to_string(),
            category: CleanCategory::DevCaches,
            risk_level: RiskLevel::Safe,
            requires_elevation: false,
            paths: vec![
                Self::expand_path("~/go/pkg/mod/cache"),
                Self::expand_path("~/.cache/go-build"),
            ],
            estimated_bytes: 0,
            file_count: 0,
            locked_count: 0,
            enabled_by_default: false,
            is_removable: true,
        });

        targets
    }

    fn get_browser_cache_paths(os: OsType) -> Vec<String> {
        match os {
            OsType::Linux => vec![
                Self::expand_path("~/.cache/google-chrome/Default/Cache"),
                Self::expand_path("~/.cache/chromium/Default/Cache"),
                Self::expand_path("~/.cache/mozilla/firefox/*.default*/cache2"),
                Self::expand_path("~/.cache/microsoft-edge/Default/Cache"),
            ],
            OsType::Windows => {
                let local = env::var("LOCALAPPDATA").unwrap_or_default();
                vec![
                    format!("{}\\Google\\Chrome\\User Data\\Default\\Cache", local),
                    format!("{}\\Microsoft\\Edge\\User Data\\Default\\Cache", local),
                    format!("{}\\Mozilla\\Firefox\\Profiles\\*\\cache2", local),
                ]
            }
            _ => vec![],
        }
    }

    pub fn expand_path(input: &str) -> String {
        if let Some(stripped) = input.strip_prefix("~/") {
            if let Ok(home) = env::var("HOME").or_else(|_| env::var("USERPROFILE")) {
                return format!("{}/{}", home.trim_end_matches('/'), stripped);
            }
        }
        input.to_string()
    }

    /// Hardcoded, immutable blocklist explicitly prohibiting matching or recursing
    /// into critical system paths (Stage 6 guardrail).
    pub fn is_path_blocked(path: &Path) -> bool {
        let path_str = path.to_string_lossy().to_lowercase();

        // Exact match or prefix root blocks
        let linux_blocked = [
            "/boot",
            "/etc",
            "/usr/bin",
            "/usr/lib",
            "/usr/lib64",
            "/bin",
            "/sbin",
            "/lib",
            "/lib64",
            "/dev",
            "/proc",
            "/sys",
            "/root",
        ];

        for blocked in &linux_blocked {
            if path_str == *blocked || path_str.starts_with(&format!("{}/", blocked)) {
                // Special allow-listing for specific cache paths under /var
                if path_str.starts_with("/var/cache/dnf")
                    || path_str.starts_with("/var/cache/libdnf5")
                    || path_str.starts_with("/var/log/journal")
                {
                    continue;
                }
                return true;
            }
        }

        let windows_blocked = [
            "c:\\windows\\system32",
            "c:\\windows\\syswow64",
            "c:\\windows\\winsxs",
            "c:\\program files",
            "c:\\program files (x86)",
            "c:\\boot",
        ];

        for blocked in &windows_blocked {
            if path_str == *blocked || path_str.starts_with(&format!("{}\\", blocked)) {
                return true;
            }
        }

        // Never allow deleting root itself
        if path_str == "/" || path_str == "c:\\" || path_str == "c:/" {
            return true;
        }

        false
    }

    /// Check if target is a symlink or reparse point (Rule: never follow symlinks out of bounds)
    pub fn is_symlink_or_reparse(path: &Path) -> bool {
        if let Ok(meta) = std::fs::symlink_metadata(path) {
            meta.file_type().is_symlink()
        } else {
            false
        }
    }
}
