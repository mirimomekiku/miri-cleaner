use miri_core::*;
use std::path::Path;

#[test]
fn test_blocklist_prevents_critical_system_deletion() {
    assert!(RuleEngine::is_path_blocked(Path::new("/boot")));
    assert!(RuleEngine::is_path_blocked(Path::new("/etc")));
    assert!(RuleEngine::is_path_blocked(Path::new("/usr/bin/bash")));
    assert!(RuleEngine::is_path_blocked(Path::new("C:\\Windows\\System32")));
    assert!(RuleEngine::is_path_blocked(Path::new("C:\\Windows\\System32\\cmd.exe")));
    assert!(RuleEngine::is_path_blocked(Path::new("/")));

    // Safe cache path should NOT be blocked
    assert!(!RuleEngine::is_path_blocked(Path::new("/var/cache/dnf")));
    assert!(!RuleEngine::is_path_blocked(Path::new("/home/user/.cache/thumbnails")));
}

#[test]
fn test_scan_all_returns_valid_structure() {
    let result = Scanner::scan_all();
    assert!(!result.targets.is_empty());
    assert!(!result.system_info.hostname.is_empty());
}

#[test]
fn test_dry_run_execution_does_not_fail() {
    let scan = Scanner::scan_all();
    let target_ids: Vec<String> = scan.targets.iter().map(|t| t.id.clone()).collect();
    let plan = CleanExecutionPlan {
        target_ids,
        dry_run: true,
        create_snapshot: false,
    };
    let exec_res = Executor::execute_plan(&plan, &scan.targets);
    assert!(exec_res.success);
}

#[test]
fn test_windows_tweaks_catalog_integrity() {
    let tweaks = WindowsTweaks::get_all_tweaks();
    assert!(tweaks.len() >= 39, "Expected at least 39 tweaks in the Windows catalog");

    let essential = tweaks.iter().filter(|t| t.category == WindowsTweakCategory::Essential).count();
    let advanced = tweaks.iter().filter(|t| t.category == WindowsTweakCategory::AdvancedCaution).count();

    assert_eq!(essential, 18, "Expected exactly 18 Essential tweaks matching the Windows catalog");
    assert!(advanced >= 21, "Expected at least 21 Advanced/Caution tweaks matching the Windows catalog");

    // Check specific essential items
    assert!(tweaks.iter().any(|t| t.id == "activity_history"));
    assert!(tweaks.iter().any(|t| t.id == "telemetry"));
    assert!(tweaks.iter().any(|t| t.id == "end_task_right_click"));
    assert!(tweaks.iter().any(|t| t.id == "restore_point_create"));

    // Check UTC tweak
    assert!(tweaks.iter().any(|t| t.id == "date_time_utc"));
}

#[test]
fn test_app_downloader_catalog_integrity() {
    let catalog = AppManager::get_catalog();
    assert!(catalog.len() >= 20, "Expected at least 20 curated apps across categories");

    // Ensure core apps exist
    assert!(catalog.iter().any(|a| a.id == "brave"));
    assert!(catalog.iter().any(|a| a.id == "firefox"));
    assert!(catalog.iter().any(|a| a.id == "vscode"));
    assert!(catalog.iter().any(|a| a.id == "steam"));
    assert!(catalog.iter().any(|a| a.id == "vlc"));
    assert!(catalog.iter().any(|a| a.id == "bitwarden"));

    // Ensure cross-platform IDs exist
    for app in &catalog {
        assert!(!app.name.is_empty());
        assert!(!app.description.is_empty());
        assert!(!app.windows_winget_id.is_empty() || !app.linux_flatpak_id.is_empty());
    }
}

#[test]
fn test_linux_tweaks_catalog_integrity() {
    let tweaks = LinuxTweaks::get_all_tweaks();
    assert!(tweaks.len() >= 25, "Expected at least 25 tweaks in Fedora Post-Install guide");

    let essential = tweaks.iter().filter(|t| t.category == LinuxTweakCategory::Essential).count();
    let optimizations = tweaks.iter().filter(|t| t.category == LinuxTweakCategory::Optimization).count();
    let extensions = tweaks.iter().filter(|t| t.category == LinuxTweakCategory::GnomeExtension).count();

    assert_eq!(essential, 5, "Expected 5 essential Fedora tweaks");
    assert!(optimizations >= 12, "Expected at least 12 optimization Fedora tweaks");
    assert!(extensions >= 8, "Expected at least 8 GNOME extension tweaks");

    // Check specific items and command availability
    assert!(tweaks.iter().any(|t| t.id == "fedora_dnf_speed"));
    assert!(tweaks.iter().any(|t| t.id == "fedora_rpmfusion"));
    assert!(tweaks.iter().any(|t| t.id == "fedora_gnome_ext_appindicator"));
    assert!(tweaks.iter().any(|t| t.id == "fedora_gnome_ext_dash_to_dock"));

    for tweak in &tweaks {
        assert!(!tweak.command.is_empty(), "Tweak {} must have an executable command", tweak.id);
    }
}

#[test]
fn test_dns_auto_detection() {
    let dns_info = detect_system_dns();
    assert!(!dns_info.display_name.is_empty());
    assert!(!dns_info.current_preset.is_empty());
}
#[test]
fn test_dev_toolchains_and_packages_integrity() {
    let targets = RuleEngine::get_default_targets(OsType::Linux);
    
    // Check dev toolchain targets
    assert!(targets.iter().any(|t| t.id == "dev-python-cache"));
    assert!(targets.iter().any(|t| t.id == "dev-modern-js-cache"));
    assert!(targets.iter().any(|t| t.id == "dev-podman-cache"));
    assert!(targets.iter().any(|t| t.id == "dev-compiler-cache"));
    assert!(targets.iter().any(|t| t.id == "dev-jvm-cache"));
    assert!(targets.iter().any(|t| t.id == "dev-go-cache"));

    // Check package manager targets
    assert!(targets.iter().any(|t| t.id == "fedora-dnf-cache"));
    assert!(targets.iter().any(|t| t.id == "flatpak-unused"));

    // Check Windows targets integrity
    let win_targets = RuleEngine::get_default_targets(OsType::Windows);
    assert!(win_targets.iter().any(|t| t.id == "win-winget-cache"));
    assert!(win_targets.iter().any(|t| t.id == "dev-jvm-cache"));
}

#[test]
fn test_new_modules_integrity() {
    // 1. Space X-Ray
    let xray = SpaceXRay::scan_path(Some("."));
    assert!(!xray.root_path.is_empty());

    // 2. Leftovers Scanner
    let _leftovers = LeftoversScanner::scan_leftovers();

    // 3. Autostart Manager
    let _autostart = AutostartManager::get_autostart_items();

    // 4. Duplicate Finder
    let _dups = DuplicateFinder::scan_duplicates(Some("."));

    // 5. System Vitals
    let vitals = SystemVitals::get_report();
    assert!(!vitals.disk_health.filesystem.is_empty());
}
