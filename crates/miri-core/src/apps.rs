use crate::elevation::ElevationManager;
use crate::models::{AppCategory, AppDefinition, OsType, TweakActionReport};
use std::process::Command;

pub struct AppManager;

impl AppManager {
    /// Returns the comprehensive curated catalog of cross-platform applications
    pub fn get_catalog() -> Vec<AppDefinition> {
        let mut catalog = vec![
            // ==========================================
            // BROWSERS
            // ==========================================
            AppDefinition {
                id: "brave".to_string(),
                name: "Brave Browser".to_string(),
                category: AppCategory::Browsers,
                description: "Privacy-focused browser with built-in ad and tracker blocking.".to_string(),
                windows_winget_id: "Brave.Brave".to_string(),
                linux_flatpak_id: "com.brave.Browser".to_string(),
                linux_dnf_package: Some("brave-browser".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "firefox".to_string(),
                name: "Mozilla Firefox".to_string(),
                category: AppCategory::Browsers,
                description: "Fast, open-source web browser backed by non-profit Mozilla.".to_string(),
                windows_winget_id: "Mozilla.Firefox".to_string(),
                linux_flatpak_id: "org.mozilla.firefox".to_string(),
                linux_dnf_package: Some("firefox".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "chrome".to_string(),
                name: "Google Chrome".to_string(),
                category: AppCategory::Browsers,
                description: "Widely used web browser developed by Google with fast V8 engine.".to_string(),
                windows_winget_id: "Google.Chrome".to_string(),
                linux_flatpak_id: "com.google.Chrome".to_string(),
                linux_dnf_package: Some("google-chrome-stable".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "librewolf".to_string(),
                name: "LibreWolf".to_string(),
                category: AppCategory::Browsers,
                description: "Custom Firefox fork with enhanced privacy and zero telemetry.".to_string(),
                windows_winget_id: "LibreWolf.LibreWolf".to_string(),
                linux_flatpak_id: "io.gitlab.librewolf-community".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "tor_browser".to_string(),
                name: "Tor Browser".to_string(),
                category: AppCategory::Browsers,
                description: "Anonymity network browser routing traffic through encrypted Tor relays.".to_string(),
                windows_winget_id: "TorProject.TorBrowser".to_string(),
                linux_flatpak_id: "com.github.micahflee.torbrowser-launcher".to_string(),
                linux_dnf_package: Some("torbrowser-launcher".to_string()),
                is_installed: false,
            },

            // ==========================================
            // COMMUNICATION
            // ==========================================
            AppDefinition {
                id: "discord".to_string(),
                name: "Discord".to_string(),
                category: AppCategory::Communication,
                description: "Voice, video, and text communication platform for communities and gaming.".to_string(),
                windows_winget_id: "Discord.Discord".to_string(),
                linux_flatpak_id: "com.discordapp.Discord".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "telegram".to_string(),
                name: "Telegram Desktop".to_string(),
                category: AppCategory::Communication,
                description: "Fast, cloud-based messaging app with desktop file sharing.".to_string(),
                windows_winget_id: "Telegram.TelegramDesktop".to_string(),
                linux_flatpak_id: "org.telegram.desktop".to_string(),
                linux_dnf_package: Some("telegram-desktop".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "signal".to_string(),
                name: "Signal Desktop".to_string(),
                category: AppCategory::Communication,
                description: "End-to-end encrypted messaging focused on privacy and security.".to_string(),
                windows_winget_id: "OpenWhisperSystems.Signal".to_string(),
                linux_flatpak_id: "org.signal.Signal".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "slack".to_string(),
                name: "Slack".to_string(),
                category: AppCategory::Communication,
                description: "Team communication and workspace collaboration channels.".to_string(),
                windows_winget_id: "SlackTechnologies.Slack".to_string(),
                linux_flatpak_id: "com.slack.Slack".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "element".to_string(),
                name: "Element (Matrix)".to_string(),
                category: AppCategory::Communication,
                description: "Decentralized, open-standard secure Matrix chat client.".to_string(),
                windows_winget_id: "Element.Element".to_string(),
                linux_flatpak_id: "im.riot.Riot".to_string(),
                linux_dnf_package: Some("element-desktop".to_string()),
                is_installed: false,
            },

            // ==========================================
            // DEVELOPMENT
            // ==========================================
            AppDefinition {
                id: "vscode".to_string(),
                name: "Visual Studio Code".to_string(),
                category: AppCategory::Development,
                description: "Extensible code editor with Git integration, debugging, and terminal.".to_string(),
                windows_winget_id: "Microsoft.VisualStudioCode".to_string(),
                linux_flatpak_id: "com.visualstudio.code".to_string(),
                linux_dnf_package: Some("code".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "git".to_string(),
                name: "Git".to_string(),
                category: AppCategory::Development,
                description: "Fast, distributed version control system for software development.".to_string(),
                windows_winget_id: "Git.Git".to_string(),
                linux_flatpak_id: "".to_string(),
                linux_dnf_package: Some("git".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "docker_podman".to_string(),
                name: "Podman / Docker Desktop".to_string(),
                category: AppCategory::Development,
                description: "Container virtualization suite for building and running OCI containers.".to_string(),
                windows_winget_id: "Docker.DockerDesktop".to_string(),
                linux_flatpak_id: "io.podman_desktop.PodmanDesktop".to_string(),
                linux_dnf_package: Some("podman".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "nodejs".to_string(),
                name: "Node.js (LTS)".to_string(),
                category: AppCategory::Development,
                description: "JavaScript runtime built on Chrome's V8 engine for backend services.".to_string(),
                windows_winget_id: "OpenJS.NodeJS.LTS".to_string(),
                linux_flatpak_id: "".to_string(),
                linux_dnf_package: Some("nodejs".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "dbeaver".to_string(),
                name: "DBeaver Community".to_string(),
                category: AppCategory::Development,
                description: "Universal SQL database GUI tool supporting Postgres, MySQL, SQLite.".to_string(),
                windows_winget_id: "dbeaver.dbeaver".to_string(),
                linux_flatpak_id: "io.dbeaver.DBeaverCommunity".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },

            // ==========================================
            // GAMING
            // ==========================================
            AppDefinition {
                id: "steam".to_string(),
                name: "Steam".to_string(),
                category: AppCategory::Gaming,
                description: "Premier digital gaming storefront and launcher with Proton support.".to_string(),
                windows_winget_id: "Valve.Steam".to_string(),
                linux_flatpak_id: "com.valvesoftware.Steam".to_string(),
                linux_dnf_package: Some("steam".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "heroic".to_string(),
                name: "Heroic Games Launcher".to_string(),
                category: AppCategory::Gaming,
                description: "Open-source native launcher for Epic Games, GOG, and Amazon Prime.".to_string(),
                windows_winget_id: "HeroicGamesLauncher.HeroicGamesLauncher".to_string(),
                linux_flatpak_id: "com.heroicgameslauncher.hgl".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "lutris".to_string(),
                name: "Lutris".to_string(),
                category: AppCategory::Gaming,
                description: "Open gaming platform for running Windows, retro, and emulator games on Linux.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "net.lutris.Lutris".to_string(),
                linux_dnf_package: Some("lutris".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "prism_launcher".to_string(),
                name: "Prism Launcher (Minecraft)".to_string(),
                category: AppCategory::Gaming,
                description: "Custom Minecraft launcher with instance management, Fabric, and Forge mods.".to_string(),
                windows_winget_id: "PrismLauncher.PrismLauncher".to_string(),
                linux_flatpak_id: "org.prismlauncher.PrismLauncher".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },

            // ==========================================
            // MEDIA & TOOLS
            // ==========================================
            AppDefinition {
                id: "vlc".to_string(),
                name: "VLC Media Player".to_string(),
                category: AppCategory::MediaTools,
                description: "Versatile multimedia player that plays most codecs without codec packs.".to_string(),
                windows_winget_id: "VideoLAN.VLC".to_string(),
                linux_flatpak_id: "org.videolan.VLC".to_string(),
                linux_dnf_package: Some("vlc".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "obs_studio".to_string(),
                name: "OBS Studio".to_string(),
                category: AppCategory::MediaTools,
                description: "Free and open source software for video recording and live streaming.".to_string(),
                windows_winget_id: "OBSProject.OBSStudio".to_string(),
                linux_flatpak_id: "com.obsproject.Studio".to_string(),
                linux_dnf_package: Some("obs-studio".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "spotify".to_string(),
                name: "Spotify".to_string(),
                category: AppCategory::MediaTools,
                description: "Digital music and podcast streaming service.".to_string(),
                windows_winget_id: "Spotify.Spotify".to_string(),
                linux_flatpak_id: "com.spotify.Client".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "gimp".to_string(),
                name: "GIMP Image Editor".to_string(),
                category: AppCategory::MediaTools,
                description: "GNU Image Manipulation Program for photo retouching and graphic design.".to_string(),
                windows_winget_id: "GIMP.GIMP".to_string(),
                linux_flatpak_id: "org.gimp.GIMP".to_string(),
                linux_dnf_package: Some("gimp".to_string()),
                is_installed: false,
            },

            // ==========================================
            // UTILITIES & PRIVACY
            // ==========================================
            AppDefinition {
                id: "archive_tool".to_string(),
                name: "7-Zip / PeaZip".to_string(),
                category: AppCategory::Utilities,
                description: "High compression ratio file archiver supporting 7z, ZIP, RAR, TAR, GZ.".to_string(),
                windows_winget_id: "7zip.7zip".to_string(),
                linux_flatpak_id: "io.github.peazip.PeaZip".to_string(),
                linux_dnf_package: Some("p7zip".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "flameshot".to_string(),
                name: "Flameshot Screenshot".to_string(),
                category: AppCategory::Utilities,
                description: "Powerful yet simple to use screenshot tool with in-place annotation.".to_string(),
                windows_winget_id: "Flameshot.Flameshot".to_string(),
                linux_flatpak_id: "org.flameshot.Flameshot".to_string(),
                linux_dnf_package: Some("flameshot".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "bitwarden".to_string(),
                name: "Bitwarden".to_string(),
                category: AppCategory::Privacy,
                description: "Secure, open-source password manager with cross-device sync.".to_string(),
                windows_winget_id: "Bitwarden.Bitwarden".to_string(),
                linux_flatpak_id: "com.bitwarden.desktop".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "keepassxc".to_string(),
                name: "KeePassXC".to_string(),
                category: AppCategory::Privacy,
                description: "Offline, encrypted local password manager with KeePass2 database format.".to_string(),
                windows_winget_id: "KeePassXCTeam.KeePassXC".to_string(),
                linux_flatpak_id: "org.keepassxc.KeePassXC".to_string(),
                linux_dnf_package: Some("keepassxc".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "bleachbit".to_string(),
                name: "BleachBit".to_string(),
                category: AppCategory::Privacy,
                description: "Open source disk space cleaner and privacy manager.".to_string(),
                windows_winget_id: "BleachBit.BleachBit".to_string(),
                linux_flatpak_id: "org.bleachbit.BleachBit".to_string(),
                linux_dnf_package: Some("bleachbit".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "vivaldi".to_string(),
                name: "Vivaldi Browser".to_string(),
                category: AppCategory::Browsers,
                description: "Highly customizable power-user browser with built-in ad blocker and tab management.".to_string(),
                windows_winget_id: "Vivaldi.Vivaldi".to_string(),
                linux_flatpak_id: "com.vivaldi.Vivaldi".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "edge".to_string(),
                name: "Microsoft Edge".to_string(),
                category: AppCategory::Browsers,
                description: "Chromium-based fast browser with vertical tabs and Copilot integration.".to_string(),
                windows_winget_id: "Microsoft.Edge".to_string(),
                linux_flatpak_id: "com.microsoft.Edge".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "zoom".to_string(),
                name: "Zoom Workplace".to_string(),
                category: AppCategory::Communication,
                description: "Enterprise video conferencing, screen sharing, and team collaboration.".to_string(),
                windows_winget_id: "Zoom.Zoom".to_string(),
                linux_flatpak_id: "us.zoom.Zoom".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "thunderbird".to_string(),
                name: "Mozilla Thunderbird".to_string(),
                category: AppCategory::Communication,
                description: "Free and open-source email, calendar, and contacts client.".to_string(),
                windows_winget_id: "Mozilla.Thunderbird".to_string(),
                linux_flatpak_id: "org.mozilla.Thunderbird".to_string(),
                linux_dnf_package: Some("thunderbird".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "vscodium".to_string(),
                name: "VSCodium".to_string(),
                category: AppCategory::Development,
                description: "Community-driven, freely-licensed binary distribution of VS Code without telemetry.".to_string(),
                windows_winget_id: "VSCodium.VSCodium".to_string(),
                linux_flatpak_id: "com.vscodium.codium".to_string(),
                linux_dnf_package: Some("codium".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "sublime_text".to_string(),
                name: "Sublime Text".to_string(),
                category: AppCategory::Development,
                description: "Sophisticated text editor for code, markup, and prose with lightning speed.".to_string(),
                windows_winget_id: "SublimeHQ.SublimeText.4".to_string(),
                linux_flatpak_id: "com.sublimetext.three".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "zed".to_string(),
                name: "Zed Editor".to_string(),
                category: AppCategory::Development,
                description: "High-performance, multiplayer code editor written in Rust with GPU rendering.".to_string(),
                windows_winget_id: "ZedIndustries.Zed".to_string(),
                linux_flatpak_id: "dev.zed.Zed".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "postman".to_string(),
                name: "Postman".to_string(),
                category: AppCategory::Development,
                description: "Comprehensive API platform for building, testing, and documenting APIs.".to_string(),
                windows_winget_id: "Postman.Postman".to_string(),
                linux_flatpak_id: "com.getpostman.Postman".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "jetbrains_toolbox".to_string(),
                name: "JetBrains Toolbox".to_string(),
                category: AppCategory::Development,
                description: "Control panel for managing JetBrains developer IDEs and project workflows.".to_string(),
                windows_winget_id: "JetBrains.Toolbox".to_string(),
                linux_flatpak_id: "com.jetbrains.Toolbox".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "gitkraken".to_string(),
                name: "GitKraken".to_string(),
                category: AppCategory::Development,
                description: "Intuitive visual Git GUI client with merge conflict editor and commit graph.".to_string(),
                windows_winget_id: "Axosoft.GitKraken".to_string(),
                linux_flatpak_id: "com.axosoft.GitKraken".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "mangohud".to_string(),
                name: "MangoHud".to_string(),
                category: AppCategory::Gaming,
                description: "Vulkan and OpenGL overlay for monitoring FPS, temperatures, CPU/GPU load, and VRAM.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "org.freedesktop.Platform.VulkanLayer.MangoHud".to_string(),
                linux_dnf_package: Some("mangohud".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "bottles".to_string(),
                name: "Bottles".to_string(),
                category: AppCategory::Gaming,
                description: "Easily manage Windows wine prefixes and run software or games on Linux.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "com.usebottles.bottles".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "audacity".to_string(),
                name: "Audacity".to_string(),
                category: AppCategory::MediaTools,
                description: "Multi-track audio editor and recorder with professional effects suite.".to_string(),
                windows_winget_id: "Audacity.Audacity".to_string(),
                linux_flatpak_id: "org.audacityteam.Audacity".to_string(),
                linux_dnf_package: Some("audacity".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "kdenlive".to_string(),
                name: "Kdenlive".to_string(),
                category: AppCategory::MediaTools,
                description: "Powerful open-source multi-track video editor powered by MLT Framework.".to_string(),
                windows_winget_id: "KDE.Kdenlive".to_string(),
                linux_flatpak_id: "org.kde.kdenlive".to_string(),
                linux_dnf_package: Some("kdenlive".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "handbrake".to_string(),
                name: "HandBrake".to_string(),
                category: AppCategory::MediaTools,
                description: "Open-source video transcoder converting video from nearly any format to modern codecs.".to_string(),
                windows_winget_id: "HandBrake.HandBrake".to_string(),
                linux_flatpak_id: "fr.handbrake.ghb".to_string(),
                linux_dnf_package: Some("handbrake-gui".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "inkscape".to_string(),
                name: "Inkscape".to_string(),
                category: AppCategory::MediaTools,
                description: "Professional vector graphics editor for SVG illustration, design, and diagrams.".to_string(),
                windows_winget_id: "Inkscape.Inkscape".to_string(),
                linux_flatpak_id: "org.inkscape.Inkscape".to_string(),
                linux_dnf_package: Some("inkscape".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "spotify".to_string(),
                name: "Spotify".to_string(),
                category: AppCategory::MediaTools,
                description: "Digital music and podcast streaming service with millions of songs.".to_string(),
                windows_winget_id: "Spotify.Spotify".to_string(),
                linux_flatpak_id: "com.spotify.Client".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "mpv".to_string(),
                name: "MPV Player".to_string(),
                category: AppCategory::MediaTools,
                description: "Lightweight, highly performant command-line and GUI media player with GPU decoding.".to_string(),
                windows_winget_id: "io.mpv.Mpv".to_string(),
                linux_flatpak_id: "io.mpv.Mpv".to_string(),
                linux_dnf_package: Some("mpv".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "mission_center".to_string(),
                name: "Mission Center".to_string(),
                category: AppCategory::Utilities,
                description: "Beautiful modern system monitor tracking CPU, GPU, memory, disks, and network.".to_string(),
                windows_winget_id: "MissionCenter.MissionCenter".to_string(),
                linux_flatpak_id: "io.missioncenter.MissionCenter".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "flatseal".to_string(),
                name: "Flatseal".to_string(),
                category: AppCategory::Utilities,
                description: "Graphical utility to review and modify fine-grained Flatpak app permissions.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "com.github.tchx84.Flatseal".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "gearlever".to_string(),
                name: "Gearlever".to_string(),
                category: AppCategory::Utilities,
                description: "Manage AppImage files, integrate them into the app menu, and manage updates.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "it.mijorus.gearlever".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "warehouse".to_string(),
                name: "Warehouse".to_string(),
                category: AppCategory::Utilities,
                description: "Manage installed Flatpaks, view leftovers, downgrade packages, and inspect remotes.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "io.github.flattool.Warehouse".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "extension_manager".to_string(),
                name: "GNOME Extension Manager".to_string(),
                category: AppCategory::Utilities,
                description: "Browse, install, update, and manage GNOME Shell extensions directly on the desktop.".to_string(),
                windows_winget_id: "".to_string(),
                linux_flatpak_id: "com.mattjakeman.ExtensionManager".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "fastfetch".to_string(),
                name: "Fastfetch".to_string(),
                category: AppCategory::Utilities,
                description: "Extremely fast, feature-rich neofetch alternative written in C for system info.".to_string(),
                windows_winget_id: "Fastfetch-cli.Fastfetch".to_string(),
                linux_flatpak_id: "".to_string(),
                linux_dnf_package: Some("fastfetch".to_string()),
                is_installed: false,
            },
            AppDefinition {
                id: "onlyoffice".to_string(),
                name: "ONLYOFFICE Desktop".to_string(),
                category: AppCategory::Utilities,
                description: "Full-featured office suite with high compatibility for MS Word, Excel, and PowerPoint.".to_string(),
                windows_winget_id: "ONLYOFFICE.DesktopEditors".to_string(),
                linux_flatpak_id: "org.onlyoffice.desktopeditors".to_string(),
                linux_dnf_package: None,
                is_installed: false,
            },
            AppDefinition {
                id: "libreoffice".to_string(),
                name: "LibreOffice".to_string(),
                category: AppCategory::Utilities,
                description: "Powerful free and open source personal productivity and office suite.".to_string(),
                windows_winget_id: "TheDocumentFoundation.LibreOffice".to_string(),
                linux_flatpak_id: "org.libreoffice.LibreOffice".to_string(),
                linux_dnf_package: Some("libreoffice".to_string()),
                is_installed: false,
            },

        ];

        Self::check_installed_status(&mut catalog);
        catalog
    }

    /// Detects whether applications are currently installed on the host system
    pub fn check_installed_status(apps: &mut [AppDefinition]) {
        let os = OsType::current();

        match os {
            OsType::Linux => {
                // Check installed Flatpaks
                if let Ok(out) = Command::new("flatpak").args(&["list", "--app", "--columns=application"]).output() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    let installed_ids: Vec<&str> = text.lines().map(|l| l.trim()).collect();
                    for app in apps.iter_mut() {
                        if !app.linux_flatpak_id.is_empty() && installed_ids.contains(&app.linux_flatpak_id.as_str()) {
                            app.is_installed = true;
                        }
                    }
                }

                // Check command binaries
                for app in apps.iter_mut() {
                    if app.is_installed {
                        continue;
                    }
                    if let Some(ref dnf_pkg) = app.linux_dnf_package {
                        if Command::new("which").arg(dnf_pkg).output().map(|o| o.status.success()).unwrap_or(false) {
                            app.is_installed = true;
                        }
                    }
                }
            }
            OsType::Windows => {
                #[cfg(target_os = "windows")]
                {
                    let script = r#"
                        $installed = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisplayName
                        $installed += Get-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisplayName
                        $installed | ConvertTo-Json -Compress
                    "#;
                    if let Ok((ok, stdout, _)) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script]) {
                        if ok {
                            let lower_out = stdout.to_lowercase();
                            for app in apps.iter_mut() {
                                if lower_out.contains(&app.name.to_lowercase()) {
                                    app.is_installed = true;
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    /// Installs an application using the native host package manager
    pub fn install_app(app_id: &str, preferred_backend: Option<&str>) -> Result<TweakActionReport, String> {
        let catalog = Self::get_catalog();
        let app = catalog.iter().find(|a| a.id == app_id).ok_or_else(|| format!("Unknown app ID: {}", app_id))?;

        let os = OsType::current();
        match os {
            OsType::Windows => {
                if app.windows_winget_id.is_empty() {
                    return Err(format!("App {} is not available on Windows", app.name));
                }
                let script = format!(
                    "winget install --id \"{}\" --silent --accept-package-agreements --accept-source-agreements",
                    app.windows_winget_id
                );
                let (ok, _out, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", &script])?;
                Ok(TweakActionReport {
                    name: format!("Install {}", app.name),
                    succeeded: ok,
                    details: if ok { format!("{} installed via WinGet", app.name) } else { err },
                })
            }
            OsType::Linux => {
                let backend = preferred_backend.unwrap_or("flatpak");
                if backend == "dnf" && app.linux_dnf_package.is_some() {
                    let pkg = app.linux_dnf_package.as_ref().unwrap();
                    let (ok, _out, err) = ElevationManager::run_elevated_command("dnf", &["install", "-y", pkg])?;
                    Ok(TweakActionReport {
                        name: format!("Install {}", app.name),
                        succeeded: ok,
                        details: if ok { format!("{} installed via DNF ({})", app.name, pkg) } else { err },
                    })
                } else {
                    if app.linux_flatpak_id.is_empty() {
                        return Err(format!("App {} does not have a Flatpak manifest", app.name));
                    }
                    let out = Command::new("flatpak")
                        .args(&["install", "-y", "flathub", &app.linux_flatpak_id])
                        .output()
                        .map_err(|e| format!("Failed to run flatpak: {}", e))?;
                    let ok = out.status.success();
                    let err = String::from_utf8_lossy(&out.stderr).to_string();
                    Ok(TweakActionReport {
                        name: format!("Install {}", app.name),
                        succeeded: ok,
                        details: if ok { format!("{} installed via Flathub", app.name) } else { err },
                    })
                }
            }
            _ => Err("Unsupported OS platform".to_string()),
        }
    }

    /// Uninstalls an application
    pub fn uninstall_app(app_id: &str) -> Result<TweakActionReport, String> {
        let catalog = Self::get_catalog();
        let app = catalog.iter().find(|a| a.id == app_id).ok_or_else(|| format!("Unknown app ID: {}", app_id))?;

        let os = OsType::current();
        match os {
            OsType::Windows => {
                let script = format!("winget uninstall --id \"{}\" --silent", app.windows_winget_id);
                let (ok, _out, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", &script])?;
                Ok(TweakActionReport {
                    name: format!("Uninstall {}", app.name),
                    succeeded: ok,
                    details: if ok { format!("{} uninstalled via WinGet", app.name) } else { err },
                })
            }
            OsType::Linux => {
                let out = Command::new("flatpak")
                    .args(&["uninstall", "-y", &app.linux_flatpak_id])
                    .output()
                    .map_err(|e| format!("Failed to run flatpak: {}", e))?;
                let ok = out.status.success();
                let err = String::from_utf8_lossy(&out.stderr).to_string();
                Ok(TweakActionReport {
                    name: format!("Uninstall {}", app.name),
                    succeeded: ok,
                    details: if ok { format!("{} uninstalled via Flatpak", app.name) } else { err },
                })
            }
            _ => Err("Unsupported OS platform".to_string()),
        }
    }

    /// Batch installation of multiple applications
    pub fn install_batch(app_ids: &[String], preferred_backend: Option<&str>) -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();
        for id in app_ids {
            match Self::install_app(id, preferred_backend) {
                Ok(rep) => reports.push(rep),
                Err(e) => reports.push(TweakActionReport {
                    name: format!("Install {}", id),
                    succeeded: false,
                    details: e,
                }),
            }
        }
        Ok(reports)
    }
}
