use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

pub struct DevCacheCleaner;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevCacheReport {
    pub name: String,
    pub freed_bytes: u64,
    pub succeeded: bool,
    pub message: String,
}

impl DevCacheCleaner {
    /// Cleans Rust Cargo temporary download cache while keeping source code
    pub fn clean_cargo_cache() -> DevCacheReport {
        let path_str = RuleEngine::expand_path("~/.cargo/registry/cache");
        let path = Path::new(&path_str);
        let mut freed = 0u64;

        if path.exists() {
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.filter_map(|e| e.ok()) {
                    if let Ok(meta) = entry.metadata() {
                        freed += meta.len();
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
            DevCacheReport {
                name: "Cargo Registry Cache".to_string(),
                freed_bytes: freed,
                succeeded: true,
                message: format!("Purged Cargo crate archive caches ({:.2} MB)", freed as f64 / (1024.0 * 1024.0)),
            }
        } else {
            DevCacheReport {
                name: "Cargo Registry Cache".to_string(),
                freed_bytes: 0,
                succeeded: true,
                message: "No Cargo cache found.".to_string(),
            }
        }
    }

    /// Prunes Docker dangling images via docker CLI
    pub fn clean_docker_images() -> DevCacheReport {
        if let Ok(which) = Command::new("which").arg("docker").output() {
            if which.status.success() {
                let output = Command::new("docker")
                    .args(["image", "prune", "-f"])
                    .output();

                return match output {
                    Ok(out) => DevCacheReport {
                        name: "Docker Dangling Images".to_string(),
                        freed_bytes: 0,
                        succeeded: out.status.success(),
                        message: String::from_utf8_lossy(&out.stdout).trim().to_string(),
                    },
                    Err(e) => DevCacheReport {
                        name: "Docker Dangling Images".to_string(),
                        freed_bytes: 0,
                        succeeded: false,
                        message: format!("Docker execution failed: {}", e),
                    },
                };
            }
        }

        DevCacheReport {
            name: "Docker Dangling Images".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: "Docker not active or not installed on host.".to_string(),
        }
    }

    /// Cleans Go build cache
    pub fn clean_go_cache() -> DevCacheReport {
        if let Ok(which) = Command::new("which").arg("go").output() {
            if which.status.success() {
                let output = Command::new("go")
                    .args(["clean", "-cache"])
                    .output();

                return match output {
                    Ok(out) => DevCacheReport {
                        name: "Go Build Cache".to_string(),
                        freed_bytes: 0,
                        succeeded: out.status.success(),
                        message: if out.status.success() { "Go cache cleaned successfully".to_string() } else { String::from_utf8_lossy(&out.stderr).to_string() },
                    },
                    Err(e) => DevCacheReport {
                        name: "Go Build Cache".to_string(),
                        freed_bytes: 0,
                        succeeded: false,
                        message: format!("Go command failed: {}", e),
                    },
                };
            }
        }

        DevCacheReport {
            name: "Go Build Cache".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: "Go toolchain not detected.".to_string(),
        }
    }

    /// Cleans Node.js npm cache
    pub fn clean_npm_cache() -> DevCacheReport {
        let path_str = RuleEngine::expand_path("~/.npm/_cacache");
        let path = Path::new(&path_str);
        if path.exists() {
            let _ = fs::remove_dir_all(path);
            DevCacheReport {
                name: "npm Cache (_cacache)".to_string(),
                freed_bytes: 0,
                succeeded: true,
                message: "Purged npm global cache directory.".to_string(),
            }
        } else {
            DevCacheReport {
                name: "npm Cache".to_string(),
                freed_bytes: 0,
                succeeded: true,
                message: "No npm cache found.".to_string(),
            }
        }
    }

    /// Prunes Podman containers, dangling images, and build cache (Fedora default container engine)
    pub fn clean_podman_cache() -> DevCacheReport {
        if let Ok(which) = Command::new("which").arg("podman").output() {
            if which.status.success() {
                let output = Command::new("podman")
                    .args(["system", "prune", "-f"])
                    .output();

                return match output {
                    Ok(out) => DevCacheReport {
                        name: "Podman System Prune".to_string(),
                        freed_bytes: 0,
                        succeeded: out.status.success(),
                        message: String::from_utf8_lossy(&out.stdout).trim().to_string(),
                    },
                    Err(e) => DevCacheReport {
                        name: "Podman System Prune".to_string(),
                        freed_bytes: 0,
                        succeeded: false,
                        message: format!("Podman execution failed: {}", e),
                    },
                };
            }
        }

        DevCacheReport {
            name: "Podman System Prune".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: "Podman not active or not installed on host.".to_string(),
        }
    }

    /// Cleans Python pip wheel cache and uv cache
    pub fn clean_python_cache() -> DevCacheReport {
        let mut messages = Vec::new();

        // 1. pip cache purge
        let has_pip = Command::new("which").arg("pip").output().map(|o| o.status.success()).unwrap_or(false)
            || Command::new("which").arg("pip3").output().map(|o| o.status.success()).unwrap_or(false);
        if has_pip {
            let pip_cmd = if Command::new("which").arg("pip").output().map(|o| o.status.success()).unwrap_or(false) {
                "pip"
            } else {
                "pip3"
            };
            if let Ok(out) = Command::new(pip_cmd).args(["cache", "purge"]).output() {
                if out.status.success() {
                    messages.push("pip cache purged".to_string());
                }
            }
        }

        // Direct directory cleanup for pip cache
        let pip_cache_path = RuleEngine::expand_path("~/.cache/pip");
        let pip_p = Path::new(&pip_cache_path);
        if pip_p.exists() {
            let _ = fs::remove_dir_all(pip_p);
            if !messages.contains(&"pip cache purged".to_string()) {
                messages.push("purged ~/.cache/pip".to_string());
            }
        }

        // 2. uv cache clean
        if let Ok(which) = Command::new("which").arg("uv").output() {
            if which.status.success() {
                if let Ok(out) = Command::new("uv").args(["cache", "clean"]).output() {
                    if out.status.success() {
                        messages.push("uv cache cleaned".to_string());
                    }
                }
            }
        }
        let uv_cache_path = RuleEngine::expand_path("~/.cache/uv");
        let uv_p = Path::new(&uv_cache_path);
        if uv_p.exists() {
            let _ = fs::remove_dir_all(uv_p);
        }

        // 3. Poetry cache
        let poetry_path = RuleEngine::expand_path("~/.cache/pypoetry");
        let pp = Path::new(&poetry_path);
        if pp.exists() {
            let _ = fs::remove_dir_all(pp);
            messages.push("Poetry cache purged".to_string());
        }

        // 4. Conda / Mamba package cache
        let conda_pkgs = RuleEngine::expand_path("~/.conda/pkgs");
        let cp = Path::new(&conda_pkgs);
        if cp.exists() {
            let _ = fs::remove_dir_all(cp);
            messages.push("Conda package cache cleaned".to_string());
        }

        DevCacheReport {
            name: "Python Ecosystem (pip, uv, Poetry, Conda)".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: if messages.is_empty() {
                "No Python cache found.".to_string()
            } else {
                messages.join(", ")
            },
        }
    }

    /// Cleans pnpm store, Yarn cache, and Bun package cache
    pub fn clean_pnpm_cache() -> DevCacheReport {
        let mut messages = Vec::new();

        // pnpm store prune
        if let Ok(which) = Command::new("which").arg("pnpm").output() {
            if which.status.success() {
                if let Ok(out) = Command::new("pnpm").args(["store", "prune"]).output() {
                    if out.status.success() {
                        messages.push("pnpm store pruned".to_string());
                    }
                }
            }
        }

        // Yarn cache clean
        if let Ok(which) = Command::new("which").arg("yarn").output() {
            if which.status.success() {
                let _ = Command::new("yarn").args(["cache", "clean"]).output();
                messages.push("yarn cache cleaned".to_string());
            }
        }

        // Bun cache
        let bun_path = RuleEngine::expand_path("~/.bun/install/cache");
        let bun_p = Path::new(&bun_path);
        if bun_p.exists() {
            let _ = fs::remove_dir_all(bun_p);
            messages.push("bun cache purged".to_string());
        }

        // 4. Deno cache
        let deno_path = RuleEngine::expand_path("~/.cache/deno");
        let dp = Path::new(&deno_path);
        if dp.exists() {
            let _ = fs::remove_dir_all(dp);
            messages.push("Deno cache purged".to_string());
        }

        // 5. Turbo repo cache
        let turbo_path = RuleEngine::expand_path("~/.cache/turbo");
        let tp = Path::new(&turbo_path);
        if tp.exists() {
            let _ = fs::remove_dir_all(tp);
            messages.push("Turbo cache purged".to_string());
        }

        DevCacheReport {
            name: "Modern JS Ecosystem (npm, pnpm, Yarn, Bun, Deno)".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: if messages.is_empty() {
                "No modern JS package caches found.".to_string()
            } else {
                messages.join(", ")
            },
        }
    }

    /// Cleans C/C++ ccache and sccache compiler caches
    pub fn clean_ccache() -> DevCacheReport {
        let mut messages = Vec::new();

        if let Ok(which) = Command::new("which").arg("ccache").output() {
            if which.status.success() {
                if let Ok(out) = Command::new("ccache").arg("-C").output() {
                    if out.status.success() {
                        messages.push("ccache cleared".to_string());
                    }
                }
            }
        }

        let ccache_path = RuleEngine::expand_path("~/.cache/ccache");
        let cp = Path::new(&ccache_path);
        if cp.exists() {
            let _ = fs::remove_dir_all(cp);
        }

        let sccache_path = RuleEngine::expand_path("~/.cache/sccache");
        let sp = Path::new(&sccache_path);
        if sp.exists() {
            let _ = fs::remove_dir_all(sp);
            messages.push("sccache cleared".to_string());
        }

        // Cargo git db
        let cargo_git = RuleEngine::expand_path("~/.cargo/git");
        let cg = Path::new(&cargo_git);
        if cg.exists() {
            let _ = fs::remove_dir_all(cg);
            messages.push("Cargo git checkouts cleaned".to_string());
        }

        // Rustup downloads & temp
        let rustup_dl = RuleEngine::expand_path("~/.rustup/downloads");
        let rd = Path::new(&rustup_dl);
        if rd.exists() {
            let _ = fs::remove_dir_all(rd);
            messages.push("Rustup temp toolchains purged".to_string());
        }

        DevCacheReport {
            name: "C/C++/Rust Compiler Cache (ccache, sccache, Cargo, Rustup)".to_string(),
            freed_bytes: 0,
            succeeded: true,
            message: if messages.is_empty() {
                "No compiler caches found.".to_string()
            } else {
                messages.join(", ")
            },
        }
    }

    /// Cleans JVM ecosystem caches: Maven ~/.m2/repository, Gradle ~/.gradle/caches & daemon, sbt / Coursier
    pub fn clean_jvm_cache() -> DevCacheReport {
        let mut messages = Vec::new();
        let mut freed = 0u64;

        // 1. Maven local repository downloaded dependencies
        let m2_path = RuleEngine::expand_path("~/.m2/repository");
        let m2 = Path::new(&m2_path);
        if m2.exists() {
            if let Ok(entries) = fs::read_dir(m2) {
                for entry in entries.filter_map(|e| e.ok()) {
                    if let Ok(meta) = entry.metadata() {
                        freed += meta.len();
                        let _ = fs::remove_dir_all(entry.path());
                    }
                }
            }
            messages.push("Maven .m2 repository purged".to_string());
        }

        // 2. Gradle caches & daemon logs
        let gradle_caches = RuleEngine::expand_path("~/.gradle/caches");
        let gc = Path::new(&gradle_caches);
        if gc.exists() {
            let _ = fs::remove_dir_all(gc);
            messages.push("Gradle build caches cleaned".to_string());
        }

        let gradle_daemon = RuleEngine::expand_path("~/.gradle/daemon");
        let gd = Path::new(&gradle_daemon);
        if gd.exists() {
            let _ = fs::remove_dir_all(gd);
        }

        // 3. Coursier / sbt cache
        let coursier = RuleEngine::expand_path("~/.cache/coursier");
        let c_path = Path::new(&coursier);
        if c_path.exists() {
            let _ = fs::remove_dir_all(c_path);
            messages.push("Coursier / sbt cache cleared".to_string());
        }

        // 4. Android SDK build-cache
        let android = RuleEngine::expand_path("~/.android/build-cache");
        let a_path = Path::new(&android);
        if a_path.exists() {
            let _ = fs::remove_dir_all(a_path);
            messages.push("Android build-cache cleaned".to_string());
        }

        DevCacheReport {
            name: "JVM Ecosystem (Maven, Gradle, sbt)".to_string(),
            freed_bytes: freed,
            succeeded: true,
            message: if messages.is_empty() {
                "No JVM caches or Maven/Gradle repositories found.".to_string()
            } else {
                messages.join(", ")
            },
        }
    }
}
