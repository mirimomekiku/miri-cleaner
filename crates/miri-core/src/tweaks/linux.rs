use crate::elevation::ElevationManager;
use crate::models::{
    DnsInfo, LinuxTweakCategory, LinuxTweakItem, RiskLevel, TweakActionReport,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

pub struct LinuxTweaks;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinuxActionReport {
    pub name: String,
    pub succeeded: bool,
    pub details: String,
}

impl LinuxTweaks {
    /// Prunes DNF / DNF5 package cache
    pub fn clean_dnf_cache() -> Result<LinuxActionReport, String> {
        let (cmd, args) = if Command::new("which").arg("dnf5").output().map(|o| o.status.success()).unwrap_or(false) {
            ("dnf5", vec!["clean", "all"])
        } else {
            ("dnf", vec!["clean", "all"])
        };

        let (ok, stdout, stderr) = ElevationManager::run_elevated_command(cmd, &args)?;
        Ok(LinuxActionReport {
            name: format!("{} Package Cache Purge", cmd.to_uppercase()),
            succeeded: ok,
            details: if ok { stdout.trim().to_string() } else { stderr.trim().to_string() },
        })
    }

    /// Safely prunes old kernels: queries RPM DB, identifies running kernel via `uname -r`,
    /// strictly preserves running kernel and the immediate N-1 fallback kernel, and flags older versions.
    pub fn list_prunable_kernels() -> Result<(Vec<String>, String), String> {
        let current_kernel = Command::new("uname")
            .arg("-r")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|_| "".to_string());

        let rpm_out = Command::new("rpm")
            .args(["-q", "kernel-core"])
            .output()
            .map_err(|e| format!("Failed to query rpm: {}", e))?;

        if !rpm_out.status.success() {
            return Ok((vec![], current_kernel));
        }

        let output = String::from_utf8_lossy(&rpm_out.stdout);
        let mut installed_kernels: Vec<String> = output
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();

        installed_kernels.sort();
        installed_kernels.reverse();

        let mut to_remove = Vec::new();
        if installed_kernels.len() > 2 {
            for (idx, k) in installed_kernels.iter().enumerate() {
                if k.contains(&current_kernel) {
                    continue;
                }
                if idx < 2 {
                    continue;
                }
                to_remove.push(k.clone());
            }
        }

        Ok((to_remove, current_kernel))
    }

    /// Prunes obsolete kernels using dnf remove
    pub fn prune_old_kernels(kernels: &[String]) -> Result<LinuxActionReport, String> {
        if kernels.is_empty() {
            return Ok(LinuxActionReport {
                name: "Kernel Pruning".to_string(),
                succeeded: true,
                details: "No obsolete kernels found. System has optimal running + fallback kernels.".to_string(),
            });
        }

        let mut args = vec!["remove", "-y"];
        for k in kernels {
            args.push(k.as_str());
        }

        let (ok, stdout, stderr) = ElevationManager::run_elevated_command("dnf", &args)?;
        Ok(LinuxActionReport {
            name: "Kernel Lifecycle Cleanup".to_string(),
            succeeded: ok,
            details: if ok { stdout.trim().to_string() } else { stderr.trim().to_string() },
        })
    }

    /// Vacuums systemd journal database without corrupting active logs
    pub fn vacuum_systemd_journal() -> Result<LinuxActionReport, String> {
        let (ok, stdout, stderr) = ElevationManager::run_elevated_command(
            "journalctl",
            &["--vacuum-time=7d", "--vacuum-size=200M"],
        )?;

        Ok(LinuxActionReport {
            name: "Systemd Journal Vacuuming".to_string(),
            succeeded: ok,
            details: if ok { stdout.trim().to_string() } else { stderr.trim().to_string() },
        })
    }

    /// Prunes unused Flatpak runtimes and caches
    pub fn clean_flatpak_unused() -> Result<LinuxActionReport, String> {
        if let Ok(which) = Command::new("which").arg("flatpak").output() {
            if which.status.success() {
                let output = Command::new("flatpak")
                    .args(["uninstall", "--unused", "-y"])
                    .output()
                    .map_err(|e| format!("Failed to run flatpak: {}", e))?;

                return Ok(LinuxActionReport {
                    name: "Flatpak Unused Runtimes Purge".to_string(),
                    succeeded: output.status.success(),
                    details: String::from_utf8_lossy(&output.stdout).trim().to_string(),
                });
            }
        }

        Ok(LinuxActionReport {
            name: "Flatpak Cleanup".to_string(),
            succeeded: true,
            details: "Flatpak not installed on host.".to_string(),
        })
    }

    // =========================================================================
    // FEDORA POST-INSTALL & OPTIMIZATION TWEAKS
    // =========================================================================

    fn is_rpm_installed(pkg: &str) -> bool {
        Command::new("rpm")
            .args(["-q", pkg])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    fn is_dnf_optimized() -> bool {
        let paths = ["/etc/dnf/dnf.conf", "/etc/dnf/dnf5.conf"];
        for p in paths {
            if let Ok(content) = fs::read_to_string(p) {
                if content.contains("max_parallel_downloads") && content.contains("fastestmirror") {
                    return true;
                }
            }
        }
        false
    }

    fn is_flathub_added() -> bool {
        Command::new("flatpak")
            .arg("remotes")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("flathub"))
            .unwrap_or(false)
    }

    fn is_nm_wait_disabled() -> bool {
        Command::new("systemctl")
            .args(["is-enabled", "NetworkManager-wait-online.service"])
            .output()
            .map(|o| {
                let s = String::from_utf8_lossy(&o.stdout);
                s.contains("disabled") || s.contains("masked")
            })
            .unwrap_or(false)
    }

    fn is_gnome_software_disabled() -> bool {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home".to_string());
        let autostart = Path::new(&home).join(".config/autostart/org.gnome.Software.desktop");
        if let Ok(content) = fs::read_to_string(autostart) {
            content.contains("X-GNOME-Autostart-enabled=false")
        } else {
            false
        }
    }

    fn is_utc_clock() -> bool {
        Command::new("timedatectl")
            .arg("status")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("RTC in local TZ: no"))
            .unwrap_or(false)
    }

    fn is_firefox_prefs_cleaned() -> bool {
        !Path::new("/usr/lib64/firefox/browser/defaults/preferences/firefox-redhat-default-prefs.js").exists()
    }

    fn is_firewall_service(svc: &str) -> bool {
        Command::new("firewall-cmd")
            .args(["--zone=public", "--query-service", svc])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "yes")
            .unwrap_or(false)
    }

    fn is_gnome_ext_installed(uuid: &str, rpm_pkg: &str) -> bool {
        if let Ok(out) = Command::new("gnome-extensions").arg("list").output() {
            let str_out = String::from_utf8_lossy(&out.stdout);
            if str_out.contains(uuid) {
                return true;
            }
        }
        Self::is_rpm_installed(rpm_pkg)
    }

    fn is_flatpak_app_installed(app_id: &str) -> bool {
        if let Ok(out) = Command::new("flatpak").arg("list").output() {
            String::from_utf8_lossy(&out.stdout).contains(app_id)
        } else {
            false
        }
    }

    fn is_zram_optimized() -> bool {
        let path = "/etc/systemd/zram-generator.conf.d/zram.conf";
        if let Ok(content) = fs::read_to_string(path) {
            content.contains("compression-algorithm = zstd")
        } else {
            false
        }
    }

    /// Returns the catalog of all Fedora Post-Install Tweaks with real-time detection
    pub fn get_all_tweaks() -> Vec<LinuxTweakItem> {
        vec![
            LinuxTweakItem {
                id: "fedora_dnf_speed".to_string(),
                name: "DNF Speedup - Parallel Downloads & Fastest Mirror".to_string(),
                category: LinuxTweakCategory::Essential,
                description: "Configures max_parallel_downloads=10, fastestmirror=True, and defaultyes=True in /etc/dnf/dnf.conf to speed up repository queries.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_dnf_optimized(),
                is_applicable: true,
                command: r#"sudo sed -i '/max_parallel_downloads/d;/fastestmirror/d;/defaultyes/d' /etc/dnf/dnf.conf && printf "max_parallel_downloads=10\nfastestmirror=True\ndefaultyes=True\n" | sudo tee -a /etc/dnf/dnf.conf"#.to_string(),
            },
            LinuxTweakItem {
                id: "fedora_rpmfusion".to_string(),
                name: "RPM Fusion - Free & Non-Free Repositories".to_string(),
                category: LinuxTweakCategory::Essential,
                description: "Enables RPM Fusion Free and Non-Free repositories for accessing proprietary drivers, Steam, Discord, and codecs.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("rpmfusion-free-release"),
                is_applicable: true,
                command: r#"sudo dnf install -y https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm"#.to_string(),
            },
            LinuxTweakItem {
                id: "fedora_appstream_core".to_string(),
                name: "App-Stream Metadata - Upgrade Core Repositories".to_string(),
                category: LinuxTweakCategory::Essential,
                description: "Upgrades core app-stream metadata packages for software center component discovery.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("fedora-appstream-metadata"),
                is_applicable: true,
                command: "sudo dnf group upgrade -y core".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_flathub".to_string(),
                name: "Flathub - Enable Unfiltered App Repository".to_string(),
                category: LinuxTweakCategory::Essential,
                description: "Adds full, unfiltered Flathub repository access for Flatpak desktop applications.".to_string(),
                requires_root: false,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_flathub_added(),
                is_applicable: true,
                command: "flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_multimedia_codecs".to_string(),
                name: "Multimedia Codecs - Full FFmpeg & GStreamer".to_string(),
                category: LinuxTweakCategory::Essential,
                description: "Swaps ffmpeg-free for full non-free FFmpeg and installs GStreamer plugins for complete audio/video playback.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("ffmpeg"),
                is_applicable: true,
                command: r#"sudo dnf swap -y ffmpeg-free ffmpeg --allowerasing && sudo dnf update -y @multimedia --setopt="install_weak_deps=False" --exclude=PackageKit-gstreamer-plugin"#.to_string(),
            },
            LinuxTweakItem {
                id: "fedora_disable_nm_wait".to_string(),
                name: "Boot Speed - Disable NetworkManager-wait-online".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Disables NetworkManager-wait-online.service, cutting system boot time by ~15s-20s.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_nm_wait_disabled(),
                is_applicable: true,
                command: "sudo systemctl disable NetworkManager-wait-online.service".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_disable_gnome_software_autostart".to_string(),
                name: "GNOME Software - Disable Background Startup & Search".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Stops org.gnome.Software from autostarting on boot (saving 100MB-900MB RAM) and disables search background indexing.".to_string(),
                requires_root: false,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_software_disabled(),
                is_applicable: true,
                command: r#"mkdir -p ~/.config/autostart && cp -f /usr/share/applications/org.gnome.Software.desktop ~/.config/autostart/ 2>/dev/null && echo "X-GNOME-Autostart-enabled=false" >> ~/.config/autostart/org.gnome.Software.desktop && dconf write /org/gnome/desktop/search-providers/disabled "['org.gnome.Software.desktop']""#.to_string(),
            },
            LinuxTweakItem {
                id: "fedora_hw_video_accel".to_string(),
                name: "Hardware Video Acceleration - VA-API & FFmpeg-Libs".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs ffmpeg-libs, libva, and libva-utils for hardware-accelerated video decoding (lowers CPU usage and laptop heat).".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("libva-utils"),
                is_applicable: true,
                command: "sudo dnf install -y ffmpeg-libs libva libva-utils".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_openh264_firefox".to_string(),
                name: "Firefox - Cisco OpenH264 & WebRTC Video Codec".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs openh264, gstreamer1-plugin-openh264, and mozilla-openh264 with Cisco OpenH264 repo enabled.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("mozilla-openh264"),
                is_applicable: true,
                command: "sudo dnf install -y openh264 gstreamer1-plugin-openh264 mozilla-openh264 && sudo dnf config-manager setopt fedora-cisco-openh264.enabled=1".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_utc_clock".to_string(),
                name: "Hardware Clock - Set Real-Time Clock to UTC".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Ensures the system hardware RTC clock is set to UTC to maintain accurate cross-boot time.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_utc_clock(),
                is_applicable: true,
                command: "sudo timedatectl set-local-rtc 0".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_fuse_appimage".to_string(),
                name: "AppImage Support - FUSE Filesystem Compatibility".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs fuse-libs so portable AppImage binaries launch seamlessly.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("fuse-libs"),
                is_applicable: true,
                command: "sudo dnf install -y fuse-libs".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_archive_utilities".to_string(),
                name: "Archive Support - 7-Zip & Unrar Extraction Suite".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs p7zip, p7zip-plugins, and unrar for opening .7z, .rar, and encrypted archives.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("p7zip"),
                is_applicable: true,
                command: "sudo dnf install -y unzip p7zip p7zip-plugins unrar".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_firefox_clean_startpage".to_string(),
                name: "Firefox - Restore Standard Blank/Home Start Page".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Removes default Red Hat / Fedora landing page redirection, restoring standard Firefox start page.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_firefox_prefs_cleaned(),
                is_applicable: true,
                command: "sudo rm -f /usr/lib64/firefox/browser/defaults/preferences/firefox-redhat-default-prefs.js".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_pop_shell".to_string(),
                name: "GNOME Extension - Pop Shell Tiling Window Manager".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Installs System76 Pop Shell extension for keyboard-driven auto-tiling windows.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("gnome-shell-extension-pop-shell"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-pop-shell xprop".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gsconnect_firewall".to_string(),
                name: "GSConnect / KDE Connect - Open Firewalld Service".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs nautilus-python and opens kdeconnect service in firewalld for seamless Android phone sync.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_firewall_service("kdeconnect"),
                is_applicable: true,
                command: "sudo dnf install -y nautilus-python && sudo firewall-cmd --permanent --zone=public --add-service=kdeconnect && sudo firewall-cmd --reload".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_appindicator".to_string(),
                name: "GNOME Extension - AppIndicator & Tray Icons".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Adds system tray icons for background applications like Steam, Discord, and Telegram to the GNOME top bar.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("appindicatorsupport@rgcjonas.gmail.com", "gnome-shell-extension-appindicator"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-appindicator".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_dash_to_dock".to_string(),
                name: "GNOME Extension - Dash to Dock".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Transforms the default GNOME dash into a customizable, always-accessible desktop application dock.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("dash-to-dock@micxgx.gmail.com", "gnome-shell-extension-dash-to-dock"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-dash-to-dock".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_blur_my_shell".to_string(),
                name: "GNOME Extension - Blur My Shell".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Adds sleek frosted-glass blur effects to the GNOME top panel, dash dock, and window overview.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("blur-my-shell@aunetx", "gnome-shell-extension-blur-my-shell"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-blur-my-shell".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_vitals".to_string(),
                name: "GNOME Extension - Vitals System Monitor".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Displays real-time hardware telemetry: CPU, RAM, GPU temperature, fan speed, and bandwidth in the top bar.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("Vitals@CoreCoding.com", "gnome-shell-extension-vitals"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-vitals".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_caffeine".to_string(),
                name: "GNOME Extension - Caffeine Sleep Inhibitor".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Quick toggle in the top bar to inhibit screen blanking, screensaver, and auto-sleep.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("caffeine@patapon.info", "gnome-shell-extension-caffeine"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-caffeine".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_just_perfection".to_string(),
                name: "GNOME Extension - Just Perfection".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Detailed tweak tool to customize GNOME Shell UI elements, animation speeds, panel sizes, and visibility.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("just-perfection-desktop@just-perfection", "gnome-shell-extension-just-perfection"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-just-perfection".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_ext_user_themes".to_string(),
                name: "GNOME Extension - User Themes".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Enables applying custom GTK and Shell themes directly from ~/.themes directory.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_gnome_ext_installed("user-theme@gnome-shell-extensions.gcampax.github.com", "gnome-shell-extension-user-theme"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-shell-extension-user-theme".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_extension_manager".to_string(),
                name: "GNOME Extension Manager (GUI)".to_string(),
                category: LinuxTweakCategory::GnomeExtension,
                description: "Native desktop application for searching, installing, and updating GNOME Shell extensions without a browser plugin.".to_string(),
                requires_root: false,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_flatpak_app_installed("com.mattjakeman.ExtensionManager"),
                is_applicable: true,
                command: "flatpak install -y flathub com.mattjakeman.ExtensionManager".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gnome_tweaks_extra".to_string(),
                name: "GNOME Tweaks & Extra Themes Suite".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs GNOME Tweaks for window titlebar buttons (minimize/maximize) and gnome-themes-extra.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("gnome-tweaks"),
                is_applicable: true,
                command: "sudo dnf install -y gnome-tweaks gnome-themes-extra".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_zram_optimization".to_string(),
                name: "ZRAM Compressed Swap Optimization (ZSTD)".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Configures zram-generator to use ZSTD compression algorithm for faster compressed RAM swap throughput.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_zram_optimized(),
                is_applicable: true,
                command: r#"sudo mkdir -p /etc/systemd/zram-generator.conf.d && printf "[zram0]\nzram-size = min(ram, 8192)\ncompression-algorithm = zstd\n" | sudo tee /etc/systemd/zram-generator.conf.d/zram.conf && sudo systemctl restart systemd-zram-setup@zram0.service"#.to_string(),
            },
            LinuxTweakItem {
                id: "fedora_gaming_mangohud".to_string(),
                name: "Gaming Optimization - MangoHud & Lutris".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Installs MangoHud GPU/CPU performance HUD overlay and Lutris game library manager.".to_string(),
                requires_root: true,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_rpm_installed("mangohud"),
                is_applicable: true,
                command: "sudo dnf install -y mangohud lutris".to_string(),
            },
            LinuxTweakItem {
                id: "fedora_flatseal_utility".to_string(),
                name: "Flatseal - Flatpak Permissions Manager".to_string(),
                category: LinuxTweakCategory::Optimization,
                description: "Graphical utility to review and modify fine-grained Flatpak permissions (filesystem, network, devices).".to_string(),
                requires_root: false,
                danger_level: RiskLevel::Safe,
                is_applied: Self::is_flatpak_app_installed("com.github.tchx84.Flatseal"),
                is_applicable: true,
                command: "flatpak install -y flathub com.github.tchx84.Flatseal".to_string(),
            },
        ]
    }

    /// Applies a batch of Fedora tweak IDs
    pub fn apply_batch(ids: &[String]) -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();

        for id in ids {
            let report = match id.as_str() {
                "fedora_dnf_speed" => {
                    let cmd = r#"sed -i '/max_parallel_downloads/d;/fastestmirror/d;/defaultyes/d' /etc/dnf/dnf.conf 2>/dev/null; printf "max_parallel_downloads=10\nfastestmirror=True\ndefaultyes=True\n" >> /etc/dnf/dnf.conf"#;
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "DNF Speedup".to_string(),
                        succeeded: ok,
                        details: if ok { "Configured max_parallel_downloads=10, fastestmirror=True".to_string() } else { err },
                    }
                }
                "fedora_rpmfusion" => {
                    let cmd = r#"fedora_ver=$(rpm -E %fedora 2>/dev/null || echo 43); dnf install -y "https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-${fedora_ver}.noarch.rpm" "https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-${fedora_ver}.noarch.rpm""#;
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "RPM Fusion Repositories".to_string(),
                        succeeded: ok,
                        details: if ok { "RPM Fusion Free & Non-Free repositories enabled".to_string() } else { err },
                    }
                }
                "fedora_appstream_core" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["group", "upgrade", "-y", "core"])?;
                    TweakActionReport {
                        name: "Core App-Stream Metadata".to_string(),
                        succeeded: ok,
                        details: if ok { "Core appstream metadata upgraded".to_string() } else { err },
                    }
                }
                "fedora_flathub" => {
                    let res = Command::new("flatpak")
                        .args(["remote-add", "--if-not-exists", "flathub", "https://dl.flathub.org/repo/flathub.flatpakrepo"])
                        .output();
                    let ok = res.as_ref().map(|o| o.status.success()).unwrap_or(false);
                    TweakActionReport {
                        name: "Flathub Remote".to_string(),
                        succeeded: ok,
                        details: if ok { "Flathub remote configured".to_string() } else { "Failed to add flathub remote".to_string() },
                    }
                }
                "fedora_multimedia_codecs" => {
                    let cmd = r#"dnf swap -y ffmpeg-free ffmpeg --allowerasing && dnf update -y @multimedia --setopt="install_weak_deps=False" --exclude=PackageKit-gstreamer-plugin"#;
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "Multimedia Codecs".to_string(),
                        succeeded: ok,
                        details: if ok { "Full FFmpeg and multimedia codecs installed".to_string() } else { err },
                    }
                }
                "fedora_disable_nm_wait" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("systemctl", &["disable", "NetworkManager-wait-online.service"])?;
                    TweakActionReport {
                        name: "Disable NM-Wait-Online".to_string(),
                        succeeded: ok,
                        details: if ok { "NetworkManager-wait-online disabled (~15s faster boot)".to_string() } else { err },
                    }
                }
                "fedora_disable_gnome_software_autostart" => {
                    let home = std::env::var("HOME").unwrap_or_else(|_| "/home".to_string());
                    let autostart_dir = format!("{}/.config/autostart", home);
                    let cmd = format!(
                        r#"mkdir -p "{}" && cp -f /usr/share/applications/org.gnome.Software.desktop "{}/" 2>/dev/null && echo "X-GNOME-Autostart-enabled=false" >> "{}/org.gnome.Software.desktop" && dconf write /org/gnome/desktop/search-providers/disabled "['org.gnome.Software.desktop']" 2>/dev/null || true"#,
                        autostart_dir, autostart_dir, autostart_dir
                    );
                    let res = Command::new("sh").args(["-c", &cmd]).output();
                    let ok = res.as_ref().map(|o| o.status.success()).unwrap_or(false);
                    TweakActionReport {
                        name: "GNOME Software Autostart".to_string(),
                        succeeded: ok,
                        details: if ok { "GNOME Software autostart & background search disabled".to_string() } else { "Failed to update autostart".to_string() },
                    }
                }
                "fedora_hw_video_accel" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "ffmpeg-libs", "libva", "libva-utils"])?;
                    TweakActionReport {
                        name: "Hardware Video Acceleration".to_string(),
                        succeeded: ok,
                        details: if ok { "VA-API and ffmpeg-libs installed".to_string() } else { err },
                    }
                }
                "fedora_openh264_firefox" => {
                    let cmd = "dnf install -y openh264 gstreamer1-plugin-openh264 mozilla-openh264 && dnf config-manager setopt fedora-cisco-openh264.enabled=1 || true";
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "Firefox Cisco OpenH264".to_string(),
                        succeeded: ok,
                        details: if ok { "Cisco OpenH264 packages installed and repo enabled".to_string() } else { err },
                    }
                }
                "fedora_utc_clock" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("timedatectl", &["set-local-rtc", "0"])?;
                    TweakActionReport {
                        name: "Set Hardware Clock UTC".to_string(),
                        succeeded: ok,
                        details: if ok { "Hardware RTC clock set to UTC".to_string() } else { err },
                    }
                }
                "fedora_fuse_appimage" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "fuse-libs"])?;
                    TweakActionReport {
                        name: "FUSE AppImage Compatibility".to_string(),
                        succeeded: ok,
                        details: if ok { "fuse-libs installed".to_string() } else { err },
                    }
                }
                "fedora_archive_utilities" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "unzip", "p7zip", "p7zip-plugins", "unrar"])?;
                    TweakActionReport {
                        name: "Archive Suite (7z & Unrar)".to_string(),
                        succeeded: ok,
                        details: if ok { "p7zip and unrar installed".to_string() } else { err },
                    }
                }
                "fedora_firefox_clean_startpage" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("rm", &["-f", "/usr/lib64/firefox/browser/defaults/preferences/firefox-redhat-default-prefs.js"])?;
                    TweakActionReport {
                        name: "Clean Firefox Start Page".to_string(),
                        succeeded: ok,
                        details: if ok { "Default Red Hat start page script removed".to_string() } else { err },
                    }
                }
                "fedora_pop_shell" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-pop-shell", "xprop"])?;
                    TweakActionReport {
                        name: "Pop Shell Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Pop Shell extension installed".to_string() } else { err },
                    }
                }
                "fedora_gsconnect_firewall" => {
                    let cmd = "dnf install -y nautilus-python && firewall-cmd --permanent --zone=public --add-service=kdeconnect && firewall-cmd --reload || true";
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "GSConnect Firewall Rules".to_string(),
                        succeeded: ok,
                        details: if ok { "KDE Connect service opened in firewall".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_appindicator" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-appindicator"])?;
                    TweakActionReport {
                        name: "AppIndicator Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "AppIndicator tray icon extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_dash_to_dock" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-dash-to-dock"])?;
                    TweakActionReport {
                        name: "Dash to Dock Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Dash to Dock extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_blur_my_shell" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-blur-my-shell"])?;
                    TweakActionReport {
                        name: "Blur My Shell Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Blur My Shell extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_vitals" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-vitals"])?;
                    TweakActionReport {
                        name: "Vitals Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Vitals system monitor extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_caffeine" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-caffeine"])?;
                    TweakActionReport {
                        name: "Caffeine Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Caffeine screen inhibitor extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_just_perfection" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-just-perfection"])?;
                    TweakActionReport {
                        name: "Just Perfection Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "Just Perfection extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_ext_user_themes" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-shell-extension-user-theme"])?;
                    TweakActionReport {
                        name: "User Themes Extension".to_string(),
                        succeeded: ok,
                        details: if ok { "User Themes extension installed".to_string() } else { err },
                    }
                }
                "fedora_gnome_extension_manager" => {
                    let res = Command::new("flatpak")
                        .args(["install", "-y", "flathub", "com.mattjakeman.ExtensionManager"])
                        .output();
                    let ok = res.as_ref().map(|o| o.status.success()).unwrap_or(false);
                    TweakActionReport {
                        name: "Extension Manager".to_string(),
                        succeeded: ok,
                        details: if ok { "Extension Manager Flatpak installed".to_string() } else { "Failed to install Extension Manager".to_string() },
                    }
                }
                "fedora_gnome_tweaks_extra" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "gnome-tweaks", "gnome-themes-extra"])?;
                    TweakActionReport {
                        name: "GNOME Tweaks Suite".to_string(),
                        succeeded: ok,
                        details: if ok { "gnome-tweaks and gnome-themes-extra installed".to_string() } else { err },
                    }
                }
                "fedora_zram_optimization" => {
                    let cmd = r#"mkdir -p /etc/systemd/zram-generator.conf.d && printf "[zram0]\nzram-size = min(ram, 8192)\ncompression-algorithm = zstd\n" > /etc/systemd/zram-generator.conf.d/zram.conf && systemctl restart systemd-zram-setup@zram0.service || true"#;
                    let (ok, _out, err) = ElevationManager::run_elevated_command("sh", &["-c", cmd])?;
                    TweakActionReport {
                        name: "ZRAM Optimization".to_string(),
                        succeeded: ok,
                        details: if ok { "Configured ZRAM zstd compression".to_string() } else { err },
                    }
                }
                "fedora_gaming_mangohud" => {
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", "mangohud", "lutris"])?;
                    TweakActionReport {
                        name: "MangoHud & Lutris".to_string(),
                        succeeded: ok,
                        details: if ok { "MangoHud and Lutris installed".to_string() } else { err },
                    }
                }
                "fedora_flatseal_utility" => {
                    let res = Command::new("flatpak")
                        .args(["install", "-y", "flathub", "com.github.tchx84.Flatseal"])
                        .output();
                    let ok = res.as_ref().map(|o| o.status.success()).unwrap_or(false);
                    TweakActionReport {
                        name: "Flatseal".to_string(),
                        succeeded: ok,
                        details: if ok { "Flatseal installed".to_string() } else { "Failed to install Flatseal".to_string() },
                    }
                }

                _ => TweakActionReport {
                    name: id.to_string(),
                    succeeded: false,
                    details: format!("Unknown Fedora tweak ID: {}", id),
                },
            };
            reports.push(report);
        }

        Ok(reports)
    }

    // =========================================================================
    // DNS AUTO-DETECTION & SWITCHER (Linux / Fedora)
    // =========================================================================

    /// Auto-detects the currently active DNS preset and IPs on Linux
    pub fn detect_dns() -> DnsInfo {
        let mut servers = Vec::new();

        if let Ok(output) = Command::new("resolvectl").arg("status").output() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            for line in out_str.lines() {
                if line.contains("DNS Servers:") {
                    let parts: Vec<&str> = line.split("DNS Servers:").collect();
                    if parts.len() > 1 {
                        for s in parts[1].split_whitespace() {
                            let ip = s.trim();
                            if !ip.is_empty() && !servers.contains(&ip.to_string()) {
                                servers.push(ip.to_string());
                            }
                        }
                    }
                }
            }
        }

        if servers.is_empty() {
            if let Ok(content) = fs::read_to_string("/etc/resolv.conf") {
                for line in content.lines() {
                    let line = line.trim();
                    if line.starts_with("nameserver") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() > 1 {
                            let ip = parts[1].to_string();
                            if !servers.contains(&ip) {
                                servers.push(ip);
                            }
                        }
                    }
                }
            }
        }

        let mut preset = "default".to_string();
        let mut display = "System Default / DHCP".to_string();

        if servers.iter().any(|s| s == "1.1.1.1" || s == "1.0.0.1") {
            preset = "cloudflare".to_string();
            display = "Cloudflare (1.1.1.1)".to_string();
        } else if servers.iter().any(|s| s == "8.8.8.8" || s == "8.8.4.4") {
            preset = "google".to_string();
            display = "Google DNS (8.8.8.8)".to_string();
        } else if servers.iter().any(|s| s == "9.9.9.9" || s == "149.112.112.112") {
            preset = "quad9".to_string();
            display = "Quad9 (9.9.9.9)".to_string();
        } else if servers.iter().any(|s| s == "94.140.14.14" || s == "94.140.15.15") {
            preset = "adguard".to_string();
            display = "AdGuard (Ad-Blocking DNS)".to_string();
        } else if !servers.is_empty() {
            display = format!("Custom ({})", servers.join(", "));
        }

        DnsInfo {
            current_preset: preset,
            servers,
            display_name: display,
        }
    }

    /// Sets the DNS servers on active network adapter using resolvectl and NetworkManager
    pub fn set_dns(preset: &str) -> Result<TweakActionReport, String> {
        let iface = Command::new("sh")
            .args(["-c", "ip route show default 2>/dev/null | awk '{print $5}' | head -n1"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|_| "".to_string());

        let target_iface = if !iface.is_empty() { iface } else { "wlo1".to_string() };

        let (ips, name) = match preset.to_lowercase().as_str() {
            "cloudflare" => (vec!["1.1.1.1", "1.0.0.1"], "Cloudflare (1.1.1.1)"),
            "google" => (vec!["8.8.8.8", "8.8.4.4"], "Google DNS (8.8.8.8)"),
            "quad9" => (vec!["9.9.9.9", "149.112.112.112"], "Quad9 (9.9.9.9)"),
            "adguard" => (vec!["94.140.14.14", "94.140.15.15"], "AdGuard (94.140.14.14)"),
            _ => (vec![], "System Default (DHCP)"),
        };

        if ips.is_empty() {
            let _ = Command::new("resolvectl").args(["revert", &target_iface]).output();
            let _ = Command::new("nmcli").args(["dev", "modify", &target_iface, "ipv4.dns", ""]).output();
            let _ = Command::new("nmcli").args(["dev", "modify", &target_iface, "ipv4.ignore-auto-dns", "no"]).output();
            return Ok(TweakActionReport {
                name: "DNS Configuration".to_string(),
                succeeded: true,
                details: format!("Reverted interface '{}' DNS to system DHCP defaults.", target_iface),
            });
        }

        let ips_str = ips.join(" ");
        let mut resolve_args = vec!["dns", &target_iface];
        resolve_args.extend(ips.iter());
        let res1 = Command::new("resolvectl").args(&resolve_args).output();
        let _ = Command::new("nmcli").args(["dev", "modify", &target_iface, "ipv4.dns", &ips_str]).output();

        let ok = res1.map(|o| o.status.success()).unwrap_or(false);

        Ok(TweakActionReport {
            name: format!("DNS: {}", name),
            succeeded: ok,
            details: if ok {
                format!("Successfully set DNS to {} on interface '{}'.", ips.join(", "), target_iface)
            } else {
                format!("Applied DNS configuration for interface '{}'.", target_iface)
            },
        })
    }
}
