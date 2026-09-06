mod tui;

use clap::{Parser, Subcommand};
use colored::*;
use miri_core::*;

#[derive(Parser)]
#[command(name = "miri-cleaner")]
#[command(author = "Miri Cleaner Contributors")]
#[command(version = "0.1.0")]
#[command(about = "(•◡•) Sparkling Clean & Ultra-Safe System Optimizer for Fedora & Windows", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Non-destructive inspection of cleanable targets
    Scan {
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Clean verified targets safely
    Clean {
        /// Simulate actions without deleting any files
        #[arg(long)]
        dry_run: bool,
        /// Create a safety snapshot before cleaning
        #[arg(long, default_value_t = true)]
        snapshot: bool,
        /// Specific target IDs to clean (comma separated)
        #[arg(long)]
        targets: Option<String>,
    },
    /// System tweaks for Fedora Linux or Windows 10/11
    Tweak {
        /// Tweak command: 'windows-update', 'windows-list', 'windows-apply', 'windows-info', 'windows-dns', 'dnf-cache', 'journal-vacuum', 'flatpak'
        name: String,
        /// Apply 'disable' or 'restore' (for Windows Update)
        #[arg(long)]
        state: Option<String>,
        /// Target tweak IDs for windows-apply (comma-separated)
        #[arg(long)]
        ids: Option<String>,
        /// Create a System Restore Point before applying Windows tweaks
        #[arg(long, default_value_t = true)]
        restore_point: bool,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
        /// DNS preset: 'default', 'cloudflare', 'google', 'quad9', 'adguard'
        #[arg(long)]
        dns: Option<String>,
    },
    /// Clean developer caches (Docker, Podman, Cargo, Python, Go, Node/pnpm, ccache)
    DevCache {
        #[arg(long)]
        cargo: bool,
        #[arg(long)]
        docker: bool,
        #[arg(long)]
        podman: bool,
        #[arg(long)]
        npm: bool,
        #[arg(long)]
        pnpm: bool,
        #[arg(long)]
        python: bool,
        #[arg(long)]
        go: bool,
        #[arg(long)]
        ccache: bool,
        #[arg(long)]
        jvm: bool,
        #[arg(long)]
        all: bool,
    },
    /// View audit log or rollback previous operations
    Rollback {
        /// Rollback the most recent session
        #[arg(long)]
        last: bool,
        /// Specific audit ID to rollback
        #[arg(long)]
        id: Option<String>,
    },
    /// Manage applications (App Downloader for Fedora & Windows)
    Apps {
        /// Subcommand: 'list', 'install', 'uninstall'
        action: String,
        /// App IDs to install (comma-separated)
        #[arg(long)]
        ids: Option<String>,
        /// App ID to uninstall
        #[arg(long)]
        id: Option<String>,
        /// Preferred package backend: 'flatpak', 'dnf', 'winget'
        #[arg(long)]
        backend: Option<String>,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Visual disk storage analyzer (Space X-Ray)
    Xray {
        /// Target directory path to analyze
        #[arg(long)]
        path: Option<String>,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Orphaned application leftovers scanner (Deep Uninstaller)
    Leftovers {
        /// Clean all detected leftovers
        #[arg(long)]
        clean: bool,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Startup applications & background boot manager
    Autostart {
        /// Toggle an autostart item by file path
        #[arg(long)]
        toggle: Option<String>,
        /// Enable state for toggle (true/false)
        #[arg(long)]
        enable: Option<bool>,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Duplicate file finder with Btrfs Reflink support (Twin Finder)
    Duplicates {
        /// Target directory path to scan for duplicates
        #[arg(long)]
        path: Option<String>,
        /// Automatically deduplicate with Btrfs copy-on-write reflink
        #[arg(long)]
        reflink: bool,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// System vitals, battery health & snapshot compactor
    Vitals {
        /// Compact snapshots older than N days
        #[arg(long)]
        compact_days: Option<u32>,
        /// Set system power profile
        #[arg(long)]
        power_profile: Option<String>,
        /// Output results as JSON
        #[arg(long)]
        json: bool,
    },
    /// Launch the interactive terminal UI
    Tui,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        None | Some(Commands::Tui) => {
            // Launch interactive TUI
            if let Err(e) = tui::run_interactive_tui() {
                eprintln!("TUI Error: {}", e);
            }
        }
        Some(Commands::Scan { json }) => {
            let scan = Scanner::scan_all();
            if json {
                println!("{}", serde_json::to_string_pretty(&scan)?);
            } else {
                println!("{}", "╭───────────────────────────────────────────────────╮".truecolor(255, 157, 157));
                println!("│ {} │", " (•◡•) MIRI CLEANER - System Inspection Report ".bold().truecolor(255, 157, 157));
                println!("{}", "╰───────────────────────────────────────────────────╯".truecolor(255, 157, 157));
                println!("OS: {} | Kernel: {}", scan.system_info.os_name.cyan(), scan.system_info.kernel_version.cyan());
                println!("Elevation Status: {}", if scan.system_info.is_elevated { "Root/Admin".green() } else { "Unprivileged User".yellow() });
                println!();

                for t in &scan.targets {
                    let risk = match t.risk_level {
                        RiskLevel::Safe => "[SAFE]".green(),
                        RiskLevel::Moderate => "[MODERATE]".yellow(),
                        RiskLevel::Aggressive | RiskLevel::Dangerous => "[DANGER]".red(),
                    };
                    println!(
                        "• {:<36} {:>8.1} MB  {}  ({} files)",
                        t.name.bold(),
                        t.estimated_bytes as f64 / (1024.0 * 1024.0),
                        risk,
                        t.file_count
                    );
                }
                println!();
                println!(
                    "Total Reclaimable Space: {} across {} targets.",
                    format!("{:.2} GB", scan.total_reclaimable_bytes as f64 / (1024.0 * 1024.0 * 1024.0)).bold().green(),
                    scan.targets.len()
                );
            }
        }
        Some(Commands::Clean { dry_run, snapshot, targets }) => {
            let scan = Scanner::scan_all();
            let selected_ids = if let Some(target_str) = targets {
                target_str.split(',').map(|s| s.trim().to_string()).collect()
            } else {
                scan.targets.iter().filter(|t| t.enabled_by_default).map(|t| t.id.clone()).collect()
            };

            let plan = CleanExecutionPlan {
                target_ids: selected_ids,
                dry_run,
                create_snapshot: snapshot,
            };

            println!("{}", if dry_run { "[DRY RUN] Simulating cleanup..." } else { "Executing cleanup with zero-trust safety..." }.bold());
            let result = Executor::execute_plan(&plan, &scan.targets);

            println!("Success: {}", if result.success { "YES".green() } else { "NO".red() });
            println!("Freed: {:.2} MB", result.freed_bytes as f64 / (1024.0 * 1024.0));
            println!("Deleted Files: {}", result.deleted_files);
            println!("Skipped (Locked/Protected): {}", result.skipped_files);
            if let Some(sid) = result.snapshot_id {
                println!("Snapshot Verified: {}", sid.cyan());
            }
            println!("Audit Journal ID: {}", result.audit_id.yellow());
        }
        Some(Commands::Tweak { name, state, ids, restore_point, json, dns }) => match name.as_str() {
            "windows-info" => {
                let info = WindowsTweaks::detect_windows_version();
                if json {
                    println!("{}", serde_json::to_string_pretty(&info)?);
                } else {
                    println!("Windows Environment: {}", info.display_name.bold().cyan());
                    println!("Build Number: {}", info.build_number);
                }
            }
            "windows-list" => {
                let tweaks = WindowsTweaks::get_all_tweaks();
                if json {
                    println!("{}", serde_json::to_string_pretty(&tweaks)?);
                } else {
                    println!("{}", "Windows 10/11 Tweaks Catalog:".bold());
                    for t in &tweaks {
                        let cat = match t.category {
                            WindowsTweakCategory::Essential => "[ESSENTIAL]".green(),
                            WindowsTweakCategory::AdvancedCaution => "[CAUTION]".yellow(),
                        };
                        println!("• {:<32} {} (Applicable: {})", t.name, cat, t.is_applicable);
                    }
                }
            }
            "windows-apply" => {
                let target_ids: Vec<String> = if let Some(id_str) = ids {
                    id_str.split(',').map(|s| s.trim().to_string()).collect()
                } else {
                    WindowsTweaks::get_all_tweaks()
                        .into_iter()
                        .filter(|t| t.category == WindowsTweakCategory::Essential && t.is_applicable)
                        .map(|t| t.id)
                        .collect()
                };

                println!("Applying {} Windows tweaks (Restore Point: {})...", target_ids.len(), restore_point);
                let reports = WindowsTweaks::apply_batch(&target_ids, restore_point)?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&reports)?);
                } else {
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                }
            }
            "linux-list" | "fedora-list" => {
                let tweaks = LinuxTweaks::get_all_tweaks();
                if json {
                    println!("{}", serde_json::to_string_pretty(&tweaks)?);
                } else {
                    println!("{}", "Fedora Post-Install Tweaks & Optimizations:".bold());
                    for t in &tweaks {
                        let status = if t.is_applied { "[APPLIED]".green() } else { "[NOT APPLIED]".yellow() };
                        println!("• {:<40} {} (Root: {})", t.name, status, t.requires_root);
                    }
                }
            }
            "linux-apply" | "fedora-apply" => {
                let target_ids: Vec<String> = if let Some(id_str) = ids {
                    id_str.split(',').map(|s| s.trim().to_string()).collect()
                } else {
                    LinuxTweaks::get_all_tweaks()
                        .into_iter()
                        .filter(|t| t.category == LinuxTweakCategory::Essential && !t.is_applied)
                        .map(|t| t.id)
                        .collect()
                };

                println!("Applying {} Fedora tweaks...", target_ids.len());
                let reports = LinuxTweaks::apply_batch(&target_ids)?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&reports)?);
                } else {
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                }
            }
            "dns-get" => {
                let dns_info = detect_system_dns();
                if json {
                    println!("{}", serde_json::to_string_pretty(&dns_info)?);
                } else {
                    println!("Current DNS Preset: {}", dns_info.current_preset.bold().cyan());
                    println!("Display Name: {}", dns_info.display_name);
                    println!("Servers: {}", dns_info.servers.join(", "));
                }
            }
            "dns-set" | "windows-dns" => {
                let preset = dns.unwrap_or_else(|| "default".to_string());
                let report = set_system_dns(&preset)?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&report)?);
                } else {
                    println!("• {}: {}", report.name, if report.succeeded { "OK".green() } else { report.details.red() });
                }
            }
            "windows-update" => {
                let s_opt = state.as_deref().map(|s| s.to_lowercase());
                if s_opt.as_deref() == Some("disable") || s_opt.as_deref() == Some("disabled") {
                    println!("Disabling Windows 10/11 updates across 4 tiers...");
                    let reports = WindowsTweaks::disable_windows_updates()?;
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                } else if s_opt.as_deref() == Some("restore") || s_opt.as_deref() == Some("default") {
                    println!("Restoring Windows Default update settings...");
                    let reports = WindowsTweaks::restore_windows_updates()?;
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                } else if s_opt.as_deref() == Some("recommended") {
                    println!("Applying Recommended Windows Update profile (365d feature defer, 4d quality defer, driver exclusion)...");
                    let reports = WindowsTweaks::apply_recommended_updates()?;
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                } else {
                    let st = WindowsTweaks::get_update_state();
                    println!("Windows Update State: Active Profile = {:?}, Fully Disabled = {}", st.active_profile, st.fully_disabled);
                }
            }
            "dnf-cache" => {
                let rep = LinuxTweaks::clean_dnf_cache()?;
                println!("{}: {}", rep.name, rep.details);
            }
            "journal-vacuum" => {
                let rep = LinuxTweaks::vacuum_systemd_journal()?;
                println!("{}: {}", rep.name, rep.details);
            }
            "flatpak" => {
                let rep = LinuxTweaks::clean_flatpak_unused()?;
                println!("{}: {}", rep.name, rep.details);
            }
            "docker-prune" => {
                let r = DevCacheCleaner::clean_docker_images();
                println!("{}: {}", r.name, r.message);
            }
            "podman-prune" => {
                let r = DevCacheCleaner::clean_podman_cache();
                println!("{}: {}", r.name, r.message);
            }
            "cargo-cache" => {
                let r = DevCacheCleaner::clean_cargo_cache();
                println!("{}: {}", r.name, r.message);
            }
            "npm-cache" => {
                let r = DevCacheCleaner::clean_npm_cache();
                println!("{}: {}", r.name, r.message);
            }
            "pnpm-cache" => {
                let r = DevCacheCleaner::clean_pnpm_cache();
                println!("{}: {}", r.name, r.message);
            }
            "python-cache" => {
                let r = DevCacheCleaner::clean_python_cache();
                println!("{}: {}", r.name, r.message);
            }
            "go-cache" => {
                let r = DevCacheCleaner::clean_go_cache();
                println!("{}: {}", r.name, r.message);
            }
            "ccache" => {
                let r = DevCacheCleaner::clean_ccache();
                println!("{}: {}", r.name, r.message);
            }
            "jvm-cache" => {
                let r = DevCacheCleaner::clean_jvm_cache();
                println!("{}: {}", r.name, r.message);
            }
            _ => eprintln!("Unknown tweak: {}", name),
        },
        Some(Commands::DevCache { cargo, docker, podman, npm, pnpm, python, go, ccache, jvm, all }) => {
            if cargo || all {
                let r = DevCacheCleaner::clean_cargo_cache();
                println!("{}: {}", r.name, r.message);
            }
            if docker || all {
                let r = DevCacheCleaner::clean_docker_images();
                println!("{}: {}", r.name, r.message);
            }
            if podman || all {
                let r = DevCacheCleaner::clean_podman_cache();
                println!("{}: {}", r.name, r.message);
            }
            if npm || all {
                let r = DevCacheCleaner::clean_npm_cache();
                println!("{}: {}", r.name, r.message);
            }
            if pnpm || all {
                let r = DevCacheCleaner::clean_pnpm_cache();
                println!("{}: {}", r.name, r.message);
            }
            if python || all {
                let r = DevCacheCleaner::clean_python_cache();
                println!("{}: {}", r.name, r.message);
            }
            if go || all {
                let r = DevCacheCleaner::clean_go_cache();
                println!("{}: {}", r.name, r.message);
            }
            if ccache || all {
                let r = DevCacheCleaner::clean_ccache();
                println!("{}: {}", r.name, r.message);
            }
            if jvm || all {
                let r = DevCacheCleaner::clean_jvm_cache();
                println!("{}: {}", r.name, r.message);
            }
        }
        Some(Commands::Rollback { last: _last, id: _id }) => {
            let entries = AuditJournal::load_entries();
            if entries.is_empty() {
                println!("No audit history entries found.");
            } else {
                println!("Audit History (Total: {}):", entries.len());
                for e in entries.iter().take(5) {
                    println!("• {} | {} | Freed: {:.1} MB | Snapshot: {:?}", 
                        e.id.yellow(), e.timestamp, e.freed_bytes as f64 / (1024.0 * 1024.0), e.snapshot_id);
                }
            }
        }
        Some(Commands::Apps { action, ids, id, backend, json }) => match action.as_str() {
            "list" => {
                let catalog = AppManager::get_catalog();
                if json {
                    println!("{}", serde_json::to_string_pretty(&catalog)?);
                } else {
                    println!("{}", "╭───────────────────────────────────────────────────╮".truecolor(255, 157, 157));
                    println!("│ {} │", " (•◡•) MIRI APP DOWNLOADER - Catalog ".bold().truecolor(255, 157, 157));
                    println!("{}", "╰───────────────────────────────────────────────────╯".truecolor(255, 157, 157));
                    for app in catalog {
                        let status = if app.is_installed { "[INSTALLED]".green() } else { "[AVAILABLE]".yellow() };
                        println!("• {:<28} {:<16} {}", app.name.bold(), format!("{:?}", app.category).cyan(), status);
                    }
                }
            }
            "install" => {
                let target_ids: Vec<String> = if let Some(id_str) = ids {
                    id_str.split(',').map(|s| s.trim().to_string()).collect()
                } else if let Some(single_id) = id {
                    vec![single_id]
                } else {
                    eprintln!("Please specify app IDs via --ids or --id");
                    return Ok(());
                };
                let reports = AppManager::install_batch(&target_ids, backend.as_deref())?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&reports)?);
                } else {
                    for r in reports {
                        println!("• {}: {}", r.name, if r.succeeded { "OK".green() } else { r.details.red() });
                    }
                }
            }
            "uninstall" => {
                let target_id = id.or_else(|| ids.and_then(|s| s.split(',').next().map(|s| s.trim().to_string())))
                    .unwrap_or_default();
                let report = AppManager::uninstall_app(&target_id)?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&report)?);
                } else {
                    println!("• {}: {}", report.name, if report.succeeded { "OK".green() } else { report.details.red() });
                }
            }
            _ => eprintln!("Unknown apps action: {}", action),
        },
        Some(Commands::Xray { path, json }) => {
            let report = SpaceXRay::scan_path(path.as_deref());
            if json {
                println!("{}", serde_json::to_string_pretty(&report)?);
            } else {
                println!("{}", "╭───────────────────────────────────────────────────╮".truecolor(255, 157, 157));
                println!("│ {} │", " (•◡•) MIRI SPACE X-RAY - Storage Visualizer       ".bold().truecolor(255, 157, 157));
                println!("{}", "╰───────────────────────────────────────────────────╯".truecolor(255, 157, 157));
                println!("Analyzed Root: {}", report.root_path.cyan());
                println!("Scanned Size: {:.2} GB across {} files", report.total_scanned_bytes as f64 / (1024.0 * 1024.0 * 1024.0), report.total_files);
                println!();
                println!("{}", "Top Largest Folders:".bold());
                for f in &report.top_folders {
                    println!("• {:<36} {:>8.1} MB  ({}% of root)", f.name, f.size_bytes as f64 / (1024.0 * 1024.0), f.percentage);
                }
                println!();
                println!("{}", "Top Largest Files:".bold());
                for file in report.largest_files.iter().take(10) {
                    println!("• {:<36} {:>8.1} MB  [{}]", file.name, file.size_bytes as f64 / (1024.0 * 1024.0), file.category.yellow());
                }
            }
        }
        Some(Commands::Leftovers { clean, json }) => {
            let items = LeftoversScanner::scan_leftovers();
            if clean {
                let mut freed = 0u64;
                for it in &items {
                    if let Ok(b) = LeftoversScanner::delete_leftover(&it.paths) {
                        freed += b;
                        println!("Cleaned leftover: {} ({:.1} MB)", it.app_name.green(), b as f64 / (1024.0 * 1024.0));
                    }
                }
                println!("Total Leftovers Purged: {:.1} MB", freed as f64 / (1024.0 * 1024.0));
            } else if json {
                println!("{}", serde_json::to_string_pretty(&items)?);
            } else {
                println!("{}", "Orphaned App Leftovers:".bold());
                for it in &items {
                    println!("• {:<36} {:>8.1} MB  [{}]", it.app_name, it.total_bytes as f64 / (1024.0 * 1024.0), it.source.yellow());
                }
                if items.is_empty() {
                    println!("No orphaned application leftovers found.");
                }
            }
        }
        Some(Commands::Autostart { toggle, enable, json }) => {
            if let Some(target) = toggle {
                let state = enable.unwrap_or(false);
                let res = AutostartManager::toggle_item(&target, state);
                println!("Autostart {}: {:?}", target, res);
            } else {
                let items = AutostartManager::get_autostart_items();
                if json {
                    println!("{}", serde_json::to_string_pretty(&items)?);
                } else {
                    println!("{}", "Startup & Boot Applications:".bold());
                    for it in &items {
                        let status = if it.enabled { "[ENABLED]".green() } else { "[DISABLED]".red() };
                        println!("• {:<32} {} Impact: {:<6} [{}]", it.name, status, it.impact.yellow(), it.source);
                    }
                }
            }
        }
        Some(Commands::Duplicates { path, reflink, json }) => {
            let groups = DuplicateFinder::scan_duplicates(path.as_deref());
            if reflink {
                let mut reflinked = 0;
                for g in &groups {
                    if g.files.len() > 1 && g.can_reflink {
                        let original = &g.files[0].path;
                        for dup in &g.files[1..] {
                            if DuplicateFinder::reflink_deduplicate(original, &dup.path).is_ok() {
                                reflinked += 1;
                            }
                        }
                    }
                }
                println!("Deduplicated {} files using Btrfs copy-on-write reflink!", reflinked);
            } else if json {
                println!("{}", serde_json::to_string_pretty(&groups)?);
            } else {
                println!("{}", "Duplicate File Groups (Twin Finder):".bold());
                for g in groups.iter().take(10) {
                    println!("• Group {} - Size: {:.1} MB ({} copies, wasted: {:.1} MB) Reflink: {}",
                        g.group_id, g.file_size as f64 / (1024.0 * 1024.0), g.count, g.wasted_bytes as f64 / (1024.0 * 1024.0), g.can_reflink);
                    for f in &g.files {
                        println!("    └─ {}", f.path);
                    }
                }
            }
        }
        Some(Commands::Vitals { compact_days, power_profile, json }) => {
            if let Some(days) = compact_days {
                let res = SystemVitals::prune_old_snapshots(days)?;
                println!("Snapshot Compactor: {}", res);
            } else if let Some(prof) = power_profile {
                let res = SystemVitals::set_power_profile(&prof)?;
                println!("{}", res);
            } else {
                let rep = SystemVitals::get_report();
                if json {
                    println!("{}", serde_json::to_string_pretty(&rep)?);
                } else {
                    println!("{}", "System Vitals & Hardware Health:".bold());
                    if let Some(bat) = &rep.battery {
                        println!("Battery: {}% ({}) | Power Source: {}", bat.percentage, bat.status, bat.power_source);
                        if let Some(c) = bat.cycle_count {
                            println!("Battery Cycles: {} | Health: {:?}%", c, bat.health_percentage);
                        }
                    }
                    if let Some(pw) = &rep.power_profile {
                        println!("Power Profile: {}", pw.active_profile.cyan());
                    }
                    println!("Filesystem: {} (Btrfs: {}) | Free: {:.1} GB / {:.1} GB",
                        rep.disk_health.filesystem, rep.disk_health.is_btrfs, rep.disk_health.free_gb, rep.disk_health.total_gb);
                    println!("Snapshots: {} total (Older than 14d: {}, Reclaimable: ~{} MB)",
                        rep.snapshot_compactor.total_snapshots, rep.snapshot_compactor.older_than_14d_count, rep.snapshot_compactor.estimated_reclaimable_mb);
                }
            }
        }
    }

    Ok(())
}
