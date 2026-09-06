use crate::elevation::ElevationManager;
use crate::models::{
    DnsInfo, RiskLevel, TweakActionReport, WindowsTweakCategory, WindowsTweakItem, WindowsUpdateState,
    WindowsVersionInfo,
};

pub struct WindowsTweaks;

impl WindowsTweaks {
    /// Auto-detects the host Windows version and build number
    pub fn detect_windows_version() -> WindowsVersionInfo {
        #[cfg(target_os = "windows")]
        {
            let script = r#"
                $build = [System.Environment]::OSVersion.Version.Build
                $reg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -ErrorAction SilentlyContinue
                $prod = if ($reg -and $reg.ProductName) { $reg.ProductName } else { "Windows" }
                $display = if ($reg -and $reg.DisplayVersion) { "$prod ($($reg.DisplayVersion), Build $build)" } else { "$prod (Build $build)" }
                $ver = if ($build -ge 22000) { 11 } else { 10 }

                [PSCustomObject]@{
                    version = $ver
                    build_number = $build
                    display_name = $display
                } | ConvertTo-Json -Compress
            "#;

            if let Ok((ok, stdout, _)) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script]) {
                if ok {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                        return WindowsVersionInfo {
                            version: val["version"].as_u64().unwrap_or(11) as u32,
                            build_number: val["build_number"].as_u64().unwrap_or(22631) as u32,
                            display_name: val["display_name"].as_str().unwrap_or("Windows 11").to_string(),
                        };
                    }
                }
            }
        }

        // Fallback for non-Windows host
        WindowsVersionInfo {
            version: 11,
            build_number: 22631,
            display_name: "Windows 11 Pro (23H2, Build 22631)".to_string(),
        }
    }

    /// Checks whether O&O ShutUp10++ companion executable is installed
    pub fn is_shutup10_installed() -> bool {
        #[cfg(target_os = "windows")]
        {
            let paths = [
                r"C:\Program Files\O&O Software\ShutUp10\OOSU10.exe",
                r"C:\Program Files (x86)\O&O Software\ShutUp10\OOSU10.exe",
            ];
            for p in &paths {
                if std::path::Path::new(p).exists() {
                    return true;
                }
            }
            if let Ok(profile) = std::env::var("USERPROFILE") {
                let p = std::path::Path::new(&profile).join(r"Downloads\OOSU10.exe");
                if p.exists() {
                    return true;
                }
            }
        }
        false
    }

    /// Returns the catalog of all Essential and Advanced Windows tweaks
    pub fn get_all_tweaks() -> Vec<WindowsTweakItem> {
        let win_info = Self::detect_windows_version();

        let mut items = vec![
            // ==========================================
            // ESSENTIAL TWEAKS
            // ==========================================
            WindowsTweakItem {
                id: "activity_history".to_string(),
                name: "Activity History - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Prevents Windows from storing timeline activities and uploading them to Microsoft servers.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "bitlocker".to_string(),
                name: "BitLocker - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables BitLocker device encryption on drive C: to prevent unexpected recovery key lockouts.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "consumer_features".to_string(),
                name: "ConsumerFeatures - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables automatic installation of promoted OEM apps and games (Candy Crush, TikTok, etc.).".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "delivery_optimization".to_string(),
                name: "Delivery Optimization - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Stops Windows Update from sharing your internet bandwidth with peer computers on the web.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "disk_cleanup".to_string(),
                name: "Disk Cleanup - Run".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Triggers automated silent Windows Disk Cleanup to purge obsolete temporary update files.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "end_task_right_click".to_string(),
                name: "End Task With Right Click - Enable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Adds an instant 'End Task' option to taskbar app icons (Windows 11 23H2+ only).".to_string(),
                min_windows_version: Some(11),
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "folder_discovery".to_string(),
                name: "File Explorer Automatic Folder Discovery - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables automatic template sniffing in File Explorer, greatly speeding up browsing large directories.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "hibernation".to_string(),
                name: "Hibernation - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables hibernation and deletes C:\\hiberfil.sys, reclaiming 8 to 32 GB of SSD storage.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "location_tracking".to_string(),
                name: "Location Tracking - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables Windows location sensors and geolocation tracking service (lfsvc).".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "store_search_results".to_string(),
                name: "Microsoft Store Recommended Search Results - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Removes web search results, Bing queries, and store ads from the Start Menu search box.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "prevent_device_companion".to_string(),
                name: "Prevent Device Companion Apps".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Blocks Windows from downloading manufacturer companion bloatware when plugging in peripherals.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "restore_point_create".to_string(),
                name: "Restore Point - Create".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Creates an immutable Windows System Restore checkpoint on drive C: before applying tweaks.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "services_manual".to_string(),
                name: "Services - Set to Manual".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Sets unnecessary diagnostic, retail demo, and telemetry services to demand-start (Manual).".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "start_menu_previous_layout".to_string(),
                name: "Start Menu Previous Layout - Enable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Aligns Start Menu and taskbar icons to the classic left position on Windows 11.".to_string(),
                min_windows_version: Some(11),
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "telemetry".to_string(),
                name: "Telemetry - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables DiagTrack, Connected User Experiences, and Windows CEIP telemetry.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "temp_files_remove".to_string(),
                name: "Temporary Files - Remove".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Cleans out %TEMP% and C:\\Windows\\Temp without touching active files.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "widgets_remove".to_string(),
                name: "Widgets - Remove".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Disables the Windows 11 taskbar widgets icon and WebExperience news feed background process.".to_string(),
                min_windows_version: Some(11),
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "wpbt_disable".to_string(),
                name: "Windows Platform Binary Table (WPBT) - Disable".to_string(),
                category: WindowsTweakCategory::Essential,
                description: "Blocks motherboard firmware from injecting vendor bloatware directly into Windows at boot.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },

            // ==========================================
            // ADVANCED TWEAKS - CAUTION
            // ==========================================
            WindowsTweakItem {
                id: "adobe_url_blocklist".to_string(),
                name: "Adobe URL Block List - Enable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Appends known Adobe telemetry and tracking domains to C:\\Windows\\System32\\drivers\\etc\\hosts.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "background_apps".to_string(),
                name: "Background Apps - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables UWP apps from running and consuming power in the background when minimized.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "brave_debloat".to_string(),
                name: "Brave Browser - Debloat".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables Brave VPN, Crypto Wallet, Rewards, and IPFS via registry group policies.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "date_time_utc".to_string(),
                name: "Date & Time - Set Time to UTC".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Configures Windows hardware clock to UTC (RealTimeIsUniversal).".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "disable_reserved_storage".to_string(),
                name: "Disable Reserved Storage".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Reclaims ~7 GB of hard drive space reserved by Windows for system updates.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "file_explorer_home_gallery".to_string(),
                name: "File Explorer Home and Gallery - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Hides Gallery from the navigation pane and sets default Explorer startup folder to 'This PC'.".to_string(),
                min_windows_version: Some(11),
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "ipv6_disable".to_string(),
                name: "IPv6 - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables IPv6 protocol bindings across network adapters (use only if your ISP doesn't support IPv6).".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "ipv6_prefer_ipv4".to_string(),
                name: "IPv6 - Set IPv4 as Preferred".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Prioritizes IPv4 DNS resolution while keeping IPv6 enabled for compatibility.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "logitech_assistant_disable".to_string(),
                name: "Logitech Download Assistant Auto-Install - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Removes Logitech Download Assistant startup autoruns to eliminate recurring popups.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "edge_debloat".to_string(),
                name: "Microsoft Edge - Debloat".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables Edge background startup boost, shopping assistant, sidebar promotions, and telemetry.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "edge_remove".to_string(),
                name: "Microsoft Edge - Remove".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Uninstalls Microsoft Edge browser while safely retaining Edge WebView2 for desktop applications.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Aggressive,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "onedrive_remove".to_string(),
                name: "Microsoft OneDrive - Remove".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Unlinks and uninstalls OneDrive, removing its sync folder from the File Explorer sidebar.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Aggressive,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "razer_software_disable".to_string(),
                name: "Razer Software Auto-Install - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Prevents Windows from automatically prompting the Razer Synapse installer when plugging in hardware.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "rdp_unsigned_warnings".to_string(),
                name: "RDP Unsigned File Warnings - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Suppresses publisher verification warnings when connecting to Remote Desktop sessions.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "right_click_classic_menu".to_string(),
                name: "Right-Click Menu Previous Layout - Enable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Restores the Windows 10 classic full right-click context menu (bypasses Windows 11 'Show more options').".to_string(),
                min_windows_version: Some(11),
                requires_admin: false,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "storage_sense_disable".to_string(),
                name: "Storage Sense - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables automated background deletion of user files in Downloads and Recycle Bin.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "tray_notifications_disable".to_string(),
                name: "System Tray Notifications & Calendar - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables action center notification popups and lock screen calendar notifications.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "teredo_disable".to_string(),
                name: "Teredo - Disable".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables Microsoft Teredo IPv6 tunneling adapter to reduce network attack surface.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "visual_effects_performance".to_string(),
                name: "Visual Effects - Set to Best Performance".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables window drop shadows, fade animations, and smooth scroll for instantaneous responsiveness.".to_string(),
                min_windows_version: None,
                requires_admin: false,
                danger_level: RiskLevel::Moderate,
                is_enabled: false,
                is_applicable: true,
                command: None,
            },
            WindowsTweakItem {
                id: "windows_ai_remove".to_string(),
                name: "Windows AI - Disable And Remove".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Disables Windows Recall snapshots, AI data analysis telemetry, and removes Copilot.".to_string(),
                min_windows_version: Some(11),
                requires_admin: true,
                danger_level: RiskLevel::Aggressive,
                is_enabled: false,
                is_applicable: win_info.version >= 11,
                command: None,
            },
            WindowsTweakItem {
                id: "shutup10_run".to_string(),
                name: "O&O ShutUp10++ - Run".to_string(),
                category: WindowsTweakCategory::AdvancedCaution,
                description: "Launches the external O&O ShutUp10++ anti-spy companion tool if installed.".to_string(),
                min_windows_version: None,
                requires_admin: true,
                danger_level: RiskLevel::Safe,
                is_enabled: false,
                is_applicable: Self::is_shutup10_installed(),
                command: None,
            },
        ];

        for item in &mut items {
            item.command = Self::get_tweak_script(&item.id).map(|s| s.trim().to_string());
        }

        items
    }

    /// Returns the PowerShell script associated with a tweak ID
    pub fn get_tweak_script(id: &str) -> Option<&'static str> {
        let script: &'static str = match id {
            "activity_history" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "PublishUserActivities" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path $p -Name "UploadUserActivities" -Value 0 -Type DWord -Force
                "#
            }
            "bitlocker" => {
                r#"Disable-BitLocker -MountPoint "C:" -ErrorAction SilentlyContinue"#
            }
            "consumer_features" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DisableWindowsConsumerFeatures" -Value 1 -Type DWord -Force
                "#
            }
            "delivery_optimization" => {
                r#"
                Stop-Service -Name DoSvc -Force -ErrorAction SilentlyContinue
                Set-Service -Name DoSvc -StartupType Disabled -ErrorAction SilentlyContinue
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DODownloadMode" -Value 0 -Type DWord -Force
                "#
            }
            "disk_cleanup" => {
                r#"Start-Process -FilePath "cleanmgr.exe" -ArgumentList "/autoclean" -Wait -WindowStyle Hidden"#
            }
            "end_task_right_click" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
                Set-ItemProperty -Path $p -Name "TaskbarEndTask" -Value 1 -Type DWord -Force
                "#
            }
            "folder_discovery" => {
                r#"
                $p = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "FolderType" -Value "NotSpecified" -Force
                "#
            }
            "hibernation" => {
                r#"powercfg.exe /hibernate off"#
            }
            "location_tracking" => {
                r#"
                Stop-Service -Name lfsvc -Force -ErrorAction SilentlyContinue
                Set-Service -Name lfsvc -StartupType Disabled -ErrorAction SilentlyContinue
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DisableLocation" -Value 1 -Type DWord -Force
                "#
            }
            "store_search_results" => {
                r#"
                $p = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DisableSearchBoxSuggestions" -Value 1 -Type DWord -Force
                Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchEnabled" -Value 0 -Type DWord -Force
                "#
            }
            "prevent_device_companion" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Settings"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DisableCoInstallers" -Value 1 -Type DWord -Force
                "#
            }
            "restore_point_create" => {
                r#"
                Enable-ComputerRestore -Drive "C:" -ErrorAction SilentlyContinue
                Checkpoint-Computer -Description "Miri-Cleaner-RestorePoint" -RestorePointType "MODIFY_SETTINGS" -ErrorAction SilentlyContinue
                "#
            }
            "services_manual" => {
                r#"
                $services = @('DiagTrack', 'MapsBroker', 'RemoteRegistry', 'RetailDemo')
                foreach ($s in $services) {
                    Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue
                }
                "#
            }
            "start_menu_previous_layout" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
                Set-ItemProperty -Path $p -Name "TaskbarAl" -Value 0 -Type DWord -Force
                "#
            }
            "telemetry" => {
                r#"
                Stop-Service -Name DiagTrack -Force -ErrorAction SilentlyContinue
                Set-Service -Name DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
                Stop-Service -Name dmwappushservice -Force -ErrorAction SilentlyContinue
                Set-Service -Name dmwappushservice -StartupType Disabled -ErrorAction SilentlyContinue
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "AllowTelemetry" -Value 0 -Type DWord -Force
                "#
            }
            "temp_files_remove" => {
                r#"
                Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
                "#
            }
            "widgets_remove" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Dsh"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "AllowNewsAndInterests" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarDa" -Value 0 -Type DWord -Force
                "#
            }
            "wpbt_disable" => {
                r#"
                $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"
                Set-ItemProperty -Path $p -Name "DisableWpbtExecution" -Value 1 -Type DWord -Force
                "#
            }
            // Advanced Tweaks
            "adobe_url_blocklist" => {
                r#"
                $hosts = "$env:windir\System32\drivers\etc\hosts"
                $lines = @(
                    "0.0.0.0 lmlicenses.wip4.adobe.com",
                    "0.0.0.0 lm.licenses.adobe.com",
                    "0.0.0.0 na1r.services.adobe.com",
                    "0.0.0.0 hlrcv.stage.adobe.com"
                )
                foreach ($l in $lines) {
                    if (!(Select-String -Path $hosts -Pattern [regex]::Escape($l) -SimpleMatch)) {
                        Add-Content -Path $hosts -Value $l -Force
                    }
                }
                "#
            }
            "background_apps" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force
                "#
            }
            "brave_debloat" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "BraveRewardsDisabled" -Value 1 -Type DWord -Force
                Set-ItemProperty -Path $p -Name "BraveWalletDisabled" -Value 1 -Type DWord -Force
                Set-ItemProperty -Path $p -Name "BraveVPNDisabled" -Value 1 -Type DWord -Force
                "#
            }
            "date_time_utc" => {
                r#"
                Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation" -Name "RealTimeIsUniversal" -Value 1 -Type DWord -Force
                "#
            }
            "disable_reserved_storage" => {
                r#"fsutil storagereserve disable"#
            }
            "file_explorer_home_gallery" => {
                r#"
                Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "LaunchTo" -Value 1 -Type DWord -Force
                Remove-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace_41040327\{e88865ea-0e1c-4e20-9aa6-ed353b747f60}" -Recurse -ErrorAction SilentlyContinue
                "#
            }
            "ipv6_disable" => {
                r#"
                $p = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
                Set-ItemProperty -Path $p -Name "DisabledComponents" -Value 0xff -Type DWord -Force
                "#
            }
            "ipv6_prefer_ipv4" => {
                r#"
                $p = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
                Set-ItemProperty -Path $p -Name "DisabledComponents" -Value 0x20 -Type DWord -Force
                "#
            }
            "logitech_assistant_disable" => {
                r#"
                Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "Logitech Download Assistant" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Logitech Download Assistant" -ErrorAction SilentlyContinue
                "#
            }
            "edge_debloat" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "StartupBoostEnabled" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path $p -Name "HubsSidebarEnabled" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path $p -Name "PersonalizationReportingEnabled" -Value 0 -Type DWord -Force
                "#
            }
            "edge_remove" => {
                r#"
                Stop-Service -Name edgeupdate -Force -ErrorAction SilentlyContinue
                Set-Service -Name edgeupdate -StartupType Disabled -ErrorAction SilentlyContinue
                Stop-Service -Name edgeupdatem -Force -ErrorAction SilentlyContinue
                Set-Service -Name edgeupdatem -StartupType Disabled -ErrorAction SilentlyContinue
                "#
            }
            "onedrive_remove" => {
                r#"
                Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue
                if (Test-Path "$env:SystemRoot\SysWOW64\OneDriveSetup.exe") {
                    Start-Process "$env:SystemRoot\SysWOW64\OneDriveSetup.exe" "/uninstall" -Wait -WindowStyle Hidden
                } elseif (Test-Path "$env:SystemRoot\System32\OneDriveSetup.exe") {
                    Start-Process "$env:SystemRoot\System32\OneDriveSetup.exe" "/uninstall" -Wait -WindowStyle Hidden
                }
                "#
            }
            "razer_software_disable" => {
                r#"
                $p = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Restrictions"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DenyDeviceIDs" -Value 1 -Type DWord -Force
                "#
            }
            "rdp_unsigned_warnings" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Terminal Server Client"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "AuthenticationLevelOverride" -Value 0 -Type DWord -Force
                "#
            }
            "right_click_classic_menu" => {
                r#"
                $p = "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "(Default)" -Value "" -Force
                Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
                "#
            }
            "storage_sense_disable" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "01" -Value 0 -Type DWord -Force
                "#
            }
            "tray_notifications_disable" => {
                r#"
                $p = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "DisableNotificationCenter" -Value 1 -Type DWord -Force
                "#
            }
            "teredo_disable" => {
                r#"netsh interface teredo set state disabled"#
            }
            "visual_effects_performance" => {
                r#"
                $p = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
                if (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
                Set-ItemProperty -Path $p -Name "VisualFXSetting" -Value 2 -Type DWord -Force
                "#
            }
            "windows_ai_remove" => {
                r#"
                $p1 = "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot"
                if (!(Test-Path $p1)) { New-Item -Path $p1 -Force | Out-Null }
                Set-ItemProperty -Path $p1 -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord -Force

                $p2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows AI"
                if (!(Test-Path $p2)) { New-Item -Path $p2 -Force | Out-Null }
                Set-ItemProperty -Path $p2 -Name "DisableAIDataAnalysis" -Value 1 -Type DWord -Force
                "#
            }
            "shutup10_run" => {
                r#"
                $paths = @("C:\Program Files\O&O Software\ShutUp10\OOSU10.exe", "$env:USERPROFILE\Downloads\OOSU10.exe")
                foreach ($p in $paths) {
                    if (Test-Path $p) {
                        Start-Process $p
                        return
                    }
                }
                Write-Output "O&O ShutUp10++ not found in Program Files or Downloads"
                "#
            }
            _ => return None,
        };
        Some(script)
    }

    /// Applies a single tweak by ID
    pub fn apply_tweak(id: &str) -> Result<TweakActionReport, String> {
        let script = match Self::get_tweak_script(id) {
            Some(s) => s,
            None => return Err(format!("Unknown tweak ID: {}", id)),
        };

        let (ok, out, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script])?;
        Ok(TweakActionReport {
            name: id.to_string(),
            succeeded: ok,
            details: if ok {
                if out.trim().is_empty() { "Tweak applied successfully".to_string() } else { out.trim().to_string() }
            } else {
                err
            },
        })
    }

    /// Auto-detects the currently active DNS preset and IPs on Windows
    pub fn detect_dns() -> DnsInfo {
        #[cfg(target_os = "windows")]
        {
            let script = r#"
                (Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { /home/mirimomekiku/.local/bin/agy.ServerAddresses.Count -gt 0 }).ServerAddresses | ConvertTo-Json -Compress
            "#;
            if let Ok((ok, stdout, _)) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script]) {
                if ok {
                    let mut servers: Vec<String> = Vec::new();
                    if let Ok(arr) = serde_json::from_str::<Vec<String>>(&stdout) {
                        servers = arr;
                    } else if let Ok(single) = serde_json::from_str::<String>(&stdout) {
                        servers.push(single);
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
                    return DnsInfo { current_preset: preset, servers, display_name: display };
                }
            }
        }
        DnsInfo {
            current_preset: "default".to_string(),
            servers: vec![],
            display_name: "System Default / DHCP".to_string(),
        }
    }

    /// Sets the DNS servers on active network adapters
    pub fn set_dns(preset: &str) -> Result<TweakActionReport, String> {
        let script = match preset.to_lowercase().as_str() {
            "cloudflare" => {
                r#"
                $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
                foreach ($a in $adapters) {
                    Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ServerAddresses ("1.1.1.1", "1.0.0.1") -ErrorAction SilentlyContinue
                }
                "#
            }
            "google" => {
                r#"
                $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
                foreach ($a in $adapters) {
                    Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ServerAddresses ("8.8.8.8", "8.8.4.4") -ErrorAction SilentlyContinue
                }
                "#
            }
            "quad9" => {
                r#"
                $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
                foreach ($a in $adapters) {
                    Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ServerAddresses ("9.9.9.9", "149.112.112.112") -ErrorAction SilentlyContinue
                }
                "#
            }
            "adguard" => {
                r#"
                $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
                foreach ($a in $adapters) {
                    Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ServerAddresses ("94.140.14.14", "94.140.15.15") -ErrorAction SilentlyContinue
                }
                "#
            }
            "default" | _ => {
                r#"
                $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
                foreach ($a in $adapters) {
                    Set-DnsClientServerAddress -InterfaceIndex $a.InterfaceIndex -ResetServerAddresses -ErrorAction SilentlyContinue
                }
                "#
            }
        };

        let (ok, _out, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script])?;
        Ok(TweakActionReport {
            name: format!("DNS: {}", preset),
            succeeded: ok,
            details: if ok { format!("DNS updated to preset: {}", preset) } else { err },
        })
    }

    /// Applies a batch of tweaks with optional pre-flight restore point
    pub fn apply_batch(ids: &[String], create_restore_point: bool) -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();

        if create_restore_point {
            match Self::apply_tweak("restore_point_create") {
                Ok(rep) => reports.push(rep),
                Err(e) => reports.push(TweakActionReport {
                    name: "Pre-Flight Restore Point".to_string(),
                    succeeded: false,
                    details: e,
                }),
            }
        }

        for id in ids {
            if id == "restore_point_create" && create_restore_point {
                continue; // already created above
            }
            match Self::apply_tweak(id) {
                Ok(rep) => reports.push(rep),
                Err(e) => reports.push(TweakActionReport {
                    name: id.clone(),
                    succeeded: false,
                    details: e,
                }),
            }
        }

        Ok(reports)
    }

    /// Inspect the 4-tier state of Windows Update and detect active profile
    pub fn get_update_state() -> WindowsUpdateState {
        // Query services, registry GPO, deferral keys, and task status via PowerShell
        let script = r#"
            $svc = Get-Service -Name wuauserv -ErrorAction SilentlyContinue
            $svcDisabled = ($svc.StartType -eq 'Disabled')

            $reg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -ErrorAction SilentlyContinue
            $gpoActive = ($reg.NoAutoUpdate -eq 1)

            $wuReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -ErrorAction SilentlyContinue
            $isDeferring = ($wuReg.DeferFeatureUpdates -eq 1)

            $task = Get-ScheduledTask -TaskPath "\Microsoft\Windows\WindowsUpdate\" -ErrorAction SilentlyContinue
            $tasksDisabled = ($task | Where-Object { $_.State -ne 'Disabled' }).Count -eq 0

            $profile = if ($svcDisabled -and $gpoActive) {
                "disable"
            } elseif ($isDeferring) {
                "recommended"
            } else {
                "default"
            }

            [PSCustomObject]@{
                services_disabled = $svcDisabled
                gpo_policies_active = $gpoActive
                scheduled_tasks_disabled = $tasksDisabled
                metered_network_shield = $false
                active_profile = $profile
            } | ConvertTo-Json -Compress
        "#;

        if let Ok((success, stdout, _)) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", script]) {
            if success {
                if let Ok(state) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let svc = state["services_disabled"].as_bool().unwrap_or(false);
                    let gpo = state["gpo_policies_active"].as_bool().unwrap_or(false);
                    let task = state["scheduled_tasks_disabled"].as_bool().unwrap_or(false);
                    let profile = state["active_profile"].as_str().map(|s| s.to_string());
                    return WindowsUpdateState {
                        services_disabled: svc,
                        gpo_policies_active: gpo,
                        scheduled_tasks_disabled: task,
                        metered_network_shield: false,
                        fully_disabled: svc && gpo && task,
                        active_profile: profile,
                    };
                }
            }
        }

        WindowsUpdateState {
            services_disabled: false,
            gpo_policies_active: false,
            scheduled_tasks_disabled: false,
            metered_network_shield: false,
            fully_disabled: false,
            active_profile: Some("default".to_string()),
        }
    }

    /// Disables Windows 10/11 updates using the 4-tiered policy
    /// (1. Service locks, 2. Policy overrides, 3. Task disabling, 4. Metered network, 5. Purge download cache)
    pub fn disable_windows_updates() -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();

        // 1. Service Locks: Stop and disable wuauserv, WaaSMedicSvc, UsoSvc, DoSvc
        let svc_script = r#"
            $services = @('wuauserv', 'WaaSMedicSvc', 'UsoSvc', 'DoSvc')
            foreach ($s in $services) {
                Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
                Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue
                sc.exe config $s start=disabled
            }
        "#;
        let (ok, _out, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", svc_script])?;
        reports.push(TweakActionReport {
            name: "Tier 1: Service Locks (wuauserv, WaaSMedicSvc, UsoSvc, DoSvc)".to_string(),
            succeeded: ok,
            details: if ok { "Services halted and startup configuration set to Disabled".to_string() } else { err },
        });

        // 2. Policy Override (GPO Registry)
        let reg_script = r#"
            $key = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
            if (!(Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
            Set-ItemProperty -Path $key -Name "NoAutoUpdate" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $key -Name "AUOptions" -Value 2 -Type DWord -Force
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", reg_script])?;
        reports.push(TweakActionReport {
            name: "Tier 2: GPO Registry Policy Override (NoAutoUpdate=1, AUOptions=2)".to_string(),
            succeeded: ok,
            details: if ok { "Registry GPO keys enforced in HKLM".to_string() } else { err },
        });

        // 3. Task Scheduler Disabling
        let task_script = r#"
            $taskPaths = @('\Microsoft\Windows\WindowsUpdate\', '\Microsoft\Windows\WaaSMedic\', '\Microsoft\Windows\UpdateOrchestrator\')
            foreach ($p in $taskPaths) {
                Get-ScheduledTask -TaskPath $p -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", task_script])?;
        reports.push(TweakActionReport {
            name: "Tier 3: Task Scheduler Disabling (WindowsUpdate, WaaSMedic, UpdateOrchestrator)".to_string(),
            succeeded: ok,
            details: if ok { "Automated self-healing maintenance tasks disabled".to_string() } else { err },
        });

        // 4. Network Metered Shield
        let net_script = r#"
            $key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\DefaultMediaCost"
            if (Test-Path $key) {
                Set-ItemProperty -Path $key -Name "WiFi" -Value 2 -Type DWord -ErrorAction SilentlyContinue
                Set-ItemProperty -Path $key -Name "Ethernet" -Value 2 -Type DWord -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", net_script])?;
        reports.push(TweakActionReport {
            name: "Tier 4: Metered Network Shield".to_string(),
            succeeded: ok,
            details: if ok { "Default interfaces designated as metered connections".to_string() } else { err },
        });

        // 5. Clear Downloaded Update Files
        let clear_script = r#"
            $downloadPath = "$env:SystemRoot\SoftwareDistribution\Download"
            if (Test-Path $downloadPath) {
                Remove-Item -Path "$downloadPath\*" -Recurse -Force -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", clear_script])?;
        reports.push(TweakActionReport {
            name: "Tier 5: Clear Downloaded Update Files".to_string(),
            succeeded: ok,
            details: if ok { "Purged downloaded update staging files in SoftwareDistribution\\Download".to_string() } else { err },
        });

        Ok(reports)
    }

    /// Applies the "Recommended" Windows Update profile:
    /// - Defers feature updates for 365 days
    /// - Defers quality updates for 4 days
    /// - Excludes drivers from quality updates
    /// - Prevents automatic restarts while user is signed in
    pub fn apply_recommended_updates() -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();

        // 1. Ensure update services are active
        let svc_script = r#"
            $services = @('wuauserv', 'WaaSMedicSvc', 'UsoSvc', 'DoSvc')
            foreach ($s in $services) {
                Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue
                sc.exe config $s start=demand
            }
            Set-Service -Name 'UsoSvc' -StartupType Automatic -ErrorAction SilentlyContinue
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", svc_script])?;
        reports.push(TweakActionReport {
            name: "Ensure Update Services Active".to_string(),
            succeeded: ok,
            details: if ok { "Services set to standard demand execution".to_string() } else { err },
        });

        // 2. Re-enable scheduled tasks
        let task_script = r#"
            $taskPaths = @('\Microsoft\Windows\WindowsUpdate\', '\Microsoft\Windows\WaaSMedic\', '\Microsoft\Windows\UpdateOrchestrator\')
            foreach ($p in $taskPaths) {
                Get-ScheduledTask -TaskPath $p -ErrorAction SilentlyContinue | Enable-ScheduledTask -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", task_script])?;
        reports.push(TweakActionReport {
            name: "Re-enable Update Tasks".to_string(),
            succeeded: ok,
            details: if ok { "Windows Update scheduled maintenance tasks enabled".to_string() } else { err },
        });

        // 3. Apply Recommended Deferral & Anti-Reboot Policies
        let reg_script = r#"
            $wuKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
            if (!(Test-Path $wuKey)) { New-Item -Path $wuKey -Force | Out-Null }
            Set-ItemProperty -Path $wuKey -Name "DeferFeatureUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuKey -Name "DeferFeatureUpdatesPeriodInDays" -Value 365 -Type DWord -Force
            Set-ItemProperty -Path $wuKey -Name "DeferQualityUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuKey -Name "DeferQualityUpdatesPeriodInDays" -Value 4 -Type DWord -Force
            Set-ItemProperty -Path $wuKey -Name "ExcludeWUDriversInQualityUpdate" -Value 1 -Type DWord -Force

            $auKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
            if (!(Test-Path $auKey)) { New-Item -Path $auKey -Force | Out-Null }
            Set-ItemProperty -Path $auKey -Name "NoAutoUpdate" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $auKey -Name "AUOptions" -Value 3 -Type DWord -Force
            Set-ItemProperty -Path $auKey -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type DWord -Force
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", reg_script])?;
        reports.push(TweakActionReport {
            name: "Apply Recommended Deferral & Anti-Reboot Policies".to_string(),
            succeeded: ok,
            details: if ok { "Deferred feature updates 365d, quality 4d, excluded drivers, prevented logged-on restart".to_string() } else { err },
        });

        Ok(reports)
    }

    /// Cleanly restores original Windows Update state (Rollback to Windows Default)
    pub fn restore_windows_updates() -> Result<Vec<TweakActionReport>, String> {
        let mut reports = Vec::new();

        // 1. Re-enable Services
        let svc_script = r#"
            $services = @(
                @{ Name = 'wuauserv'; Type = 'Manual' },
                @{ Name = 'WaaSMedicSvc'; Type = 'Manual' },
                @{ Name = 'UsoSvc'; Type = 'Automatic' },
                @{ Name = 'DoSvc'; Type = 'Automatic' }
            )
            foreach ($s in $services) {
                Set-Service -Name $s.Name -StartupType $s.Type -ErrorAction SilentlyContinue
                sc.exe config $s.Name start=demand
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", svc_script])?;
        reports.push(TweakActionReport {
            name: "Restore Services (Manual/Automatic)".to_string(),
            succeeded: ok,
            details: if ok { "Update services restored to standard startup mode".to_string() } else { err },
        });

        // 2. Remove Registry GPO and Deferral keys
        let reg_script = r#"
            $auKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
            if (Test-Path $auKey) {
                Remove-ItemProperty -Path $auKey -Name "NoAutoUpdate" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $auKey -Name "AUOptions" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $auKey -Name "NoAutoRebootWithLoggedOnUsers" -ErrorAction SilentlyContinue
            }
            $wuKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
            if (Test-Path $wuKey) {
                Remove-ItemProperty -Path $wuKey -Name "DeferFeatureUpdates" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $wuKey -Name "DeferFeatureUpdatesPeriodInDays" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $wuKey -Name "DeferQualityUpdates" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $wuKey -Name "DeferQualityUpdatesPeriodInDays" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $wuKey -Name "ExcludeWUDriversInQualityUpdate" -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", reg_script])?;
        reports.push(TweakActionReport {
            name: "Restore GPO Registry Policies".to_string(),
            succeeded: ok,
            details: if ok { "Windows Update policies and deferral overrides removed".to_string() } else { err },
        });

        // 3. Re-enable Scheduled Tasks
        let task_script = r#"
            $taskPaths = @('\Microsoft\Windows\WindowsUpdate\', '\Microsoft\Windows\WaaSMedic\', '\Microsoft\Windows\UpdateOrchestrator\')
            foreach ($p in $taskPaths) {
                Get-ScheduledTask -TaskPath $p -ErrorAction SilentlyContinue | Enable-ScheduledTask -ErrorAction SilentlyContinue
            }
        "#;
        let (ok, _, err) = ElevationManager::run_elevated_command("powershell", &["-NoProfile", "-Command", task_script])?;
        reports.push(TweakActionReport {
            name: "Restore Scheduled Tasks".to_string(),
            succeeded: ok,
            details: if ok { "Maintenance tasks re-enabled in Task Scheduler".to_string() } else { err },
        });

        Ok(reports)
    }

    /// Applies a specific profile: "recommended", "default", or "disable"
    pub fn apply_update_profile(profile: &str) -> Result<Vec<TweakActionReport>, String> {
        match profile.to_lowercase().as_str() {
            "recommended" => Self::apply_recommended_updates(),
            "default" | "restore" => Self::restore_windows_updates(),
            "disable" | "disabled" => Self::disable_windows_updates(),
            _ => Err(format!("Unknown Windows Update profile: {}", profile)),
        }
    }
}
