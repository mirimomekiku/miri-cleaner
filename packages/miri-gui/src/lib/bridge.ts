import { z } from "zod";
import {
  ScanResult,
  CleanExecutionPlan,
  CleanExecutionResult,
  WindowsUpdateState,
  SnapshotStatus,
  AuditEntry,
  WindowsTweakItem,
  WindowsVersionInfo,
  TweakActionReport,
  AppDefinition,
  LinuxTweakItem,
  DnsInfo,
  ScanResultSchema,
  CleanExecutionResultSchema,
  SnapshotStatusSchema,
  WindowsUpdateStateSchema,
  AuditEntrySchema,
  WindowsTweakItemSchema,
  WindowsVersionInfoSchema,
  TweakActionReportSchema,
  AppDefinitionSchema,
  LinuxTweakItemSchema,
  DnsInfoSchema,
  XRayReport,
  XRayReportSchema,
  AppLeftover,
  AppLeftoverSchema,
  InstalledAppUsage,
  InstalledAppUsageSchema,
  AutostartItem,
  AutostartItemSchema,
  DuplicateGroup,
  DuplicateGroupSchema,
  SystemVitalsReport,
  SystemVitalsReportSchema,
} from "../types";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    miriElectron?: {
      invoke: <T>(channel: string, args?: unknown) => Promise<T>;
    };
  }
}

export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export const isElectron = (): boolean => {
  return typeof window !== "undefined" && typeof window.miriElectron !== "undefined";
};

export async function invokeNative<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isElectron() && window.miriElectron) {
    return await window.miriElectron.invoke<T>(cmd, args);
  }
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, args);
  }
  throw new Error("No native desktop runtime found");
}

// Simulated data for browser testing / dev mode
const mockAuditEntries: AuditEntry[] = [
  {
    id: "audit-20260906064224",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    operation: "dry-run-scan",
    target_ids: ["browser-caches", "dev-node-cache"],
    freed_bytes: 3566810000,
    snapshot_id: "snapper-snapshot-20260906",
    rollback_payload: { dry_run: "true" },
    is_rolled_back: false,
  },
  {
    id: "audit-20260905141022",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    operation: "system-clean",
    target_ids: ["fedora-dnf-cache", "systemd-journal"],
    freed_bytes: 2075312120,
    snapshot_id: "timeshift-snapshot-20260905",
    rollback_payload: {},
    is_rolled_back: false,
  },
];

const mockAutostartItems: AutostartItem[] = [
  { id: "discord.desktop", name: "Discord", command: "flatpak run com.discordapp.Discord", enabled: true, file_path: "~/.config/autostart/discord.desktop", impact: "high", source: "user_autostart" },
  { id: "steam.desktop", name: "Steam Client", command: "steam -silent", enabled: true, file_path: "~/.config/autostart/steam.desktop", impact: "high", source: "user_autostart" },
  { id: "spotify.desktop", name: "Spotify", command: "spotify --minimized", enabled: false, file_path: "~/.config/autostart/spotify.desktop", impact: "medium", source: "user_autostart" },
  { id: "nextcloud.desktop", name: "Nextcloud Desktop", command: "nextcloud --background", enabled: true, file_path: "~/.config/autostart/nextcloud.desktop", impact: "medium", source: "user_autostart" },
  { id: "gamemode.desktop", name: "Feral GameMode Indicator", command: "gamemoded", enabled: true, file_path: "/etc/xdg/autostart/gamemoded.desktop", impact: "low", source: "system_autostart" },
];

const mockLinuxTweaks: LinuxTweakItem[] = [
  {
    id: "fedora_dnf_speed",
    name: "DNF Speedup - Parallel Downloads & Fastest Mirror",
    category: "essential",
    description: "Configures max_parallel_downloads=10, fastestmirror=True, and defaultyes=True in /etc/dnf/dnf.conf to speed up repository queries.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-dnf-speed --apply"
  },
  {
    id: "fedora_rpmfusion",
    name: "RPM Fusion - Free & Non-Free Repositories",
    category: "essential",
    description: "Enables RPM Fusion Free and Non-Free repositories for accessing proprietary drivers, Steam, Discord, and codecs.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-rpmfusion --apply"
  },
  {
    id: "fedora_appstream_core",
    name: "App-Stream Metadata - Upgrade Core Repositories",
    category: "essential",
    description: "Upgrades core app-stream metadata packages for software center component discovery.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-appstream-core --apply"
  },
  {
    id: "fedora_flathub",
    name: "Flathub - Enable Unfiltered App Repository",
    category: "essential",
    description: "Adds full, unfiltered Flathub repository access for Flatpak desktop applications.",
    requires_root: false,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-flathub --apply"
  },
  {
    id: "fedora_multimedia_codecs",
    name: "Multimedia Codecs - Full FFmpeg & GStreamer",
    category: "essential",
    description: "Swaps ffmpeg-free for full non-free FFmpeg and installs GStreamer plugins for complete audio/video playback.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-multimedia-codecs --apply"
  },
  {
    id: "fedora_disable_nm_wait",
    name: "Boot Speed - Disable NetworkManager-wait-online",
    category: "optimization",
    description: "Disables NetworkManager-wait-online.service, cutting system boot time by ~15s-20s.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-disable-nm-wait --apply"
  },
  {
    id: "fedora_disable_gnome_software_autostart",
    name: "GNOME Software - Disable Background Startup & Search",
    category: "optimization",
    description: "Stops org.gnome.Software from autostarting on boot (saving 100MB-900MB RAM) and disables search background indexing.",
    requires_root: false,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-disable-gnome-software-autostart --apply"
  },
  {
    id: "fedora_hw_video_accel",
    name: "Hardware Video Acceleration - VA-API & FFmpeg-Libs",
    category: "optimization",
    description: "Installs ffmpeg-libs, libva, and libva-utils for hardware-accelerated video decoding (lowers CPU usage and laptop heat).",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-hw-video-accel --apply"
  },
  {
    id: "fedora_openh264_firefox",
    name: "Firefox - Cisco OpenH264 & WebRTC Video Codec",
    category: "optimization",
    description: "Installs openh264, gstreamer1-plugin-openh264, and mozilla-openh264 with Cisco OpenH264 repo enabled.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-openh264-firefox --apply"
  },
  {
    id: "fedora_utc_clock",
    name: "Hardware Clock - Set Real-Time Clock to UTC",
    category: "optimization",
    description: "Ensures the system hardware RTC clock is set to UTC to maintain accurate cross-boot time.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-utc-clock --apply"
  },
  {
    id: "fedora_fuse_appimage",
    name: "AppImage Support - FUSE Filesystem Compatibility",
    category: "optimization",
    description: "Installs fuse-libs so portable AppImage binaries launch seamlessly.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-fuse-appimage --apply"
  },
  {
    id: "fedora_archive_utilities",
    name: "Archive Support - 7-Zip & Unrar Extraction Suite",
    category: "optimization",
    description: "Installs p7zip, p7zip-plugins, and unrar for opening .7z, .rar, and encrypted archives.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-archive-utilities --apply"
  },
  {
    id: "fedora_firefox_clean_startpage",
    name: "Firefox - Restore Standard Blank/Home Start Page",
    category: "optimization",
    description: "Removes default Red Hat / Fedora landing page redirection, restoring standard Firefox start page.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-firefox-clean-startpage --apply"
  },
  {
    id: "fedora_pop_shell",
    name: "GNOME Extension - Pop Shell Tiling Window Manager",
    category: "gnome_extension",
    description: "Installs System76 Pop Shell extension for keyboard-driven auto-tiling windows.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-pop-shell --apply"
  },
  {
    id: "fedora_gsconnect_firewall",
    name: "GSConnect / KDE Connect - Open Firewalld Service",
    category: "optimization",
    description: "Installs nautilus-python and opens kdeconnect service in firewalld for seamless Android phone sync.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-gsconnect-firewall --apply"
  },
  {
    id: "fedora_gnome_ext_appindicator",
    name: "GNOME Extension - AppIndicator & Tray Icons",
    category: "gnome_extension",
    description: "Adds system tray icons for background applications like Steam, Discord, and Telegram to the GNOME top bar.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-appindicator --apply"
  },
  {
    id: "fedora_gnome_ext_dash_to_dock",
    name: "GNOME Extension - Dash to Dock",
    category: "gnome_extension",
    description: "Transforms the default GNOME dash into a customizable, always-accessible desktop application dock.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-dash-to-dock --apply"
  },
  {
    id: "fedora_gnome_ext_blur_my_shell",
    name: "GNOME Extension - Blur My Shell",
    category: "gnome_extension",
    description: "Adds sleek frosted-glass blur effects to the GNOME top panel, dash dock, and window overview.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-blur-my-shell --apply"
  },
  {
    id: "fedora_gnome_ext_vitals",
    name: "GNOME Extension - Vitals System Monitor",
    category: "gnome_extension",
    description: "Displays real-time hardware telemetry: CPU, RAM, GPU temperature, fan speed, and bandwidth in the top bar.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-vitals --apply"
  },
  {
    id: "fedora_gnome_ext_caffeine",
    name: "GNOME Extension - Caffeine Sleep Inhibitor",
    category: "gnome_extension",
    description: "Quick toggle in the top bar to inhibit screen blanking, screensaver, and auto-sleep.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-caffeine --apply"
  },
  {
    id: "fedora_gnome_ext_just_perfection",
    name: "GNOME Extension - Just Perfection",
    category: "gnome_extension",
    description: "Detailed tweak tool to customize GNOME Shell UI elements, animation speeds, panel sizes, and visibility.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-just-perfection --apply"
  },
  {
    id: "fedora_gnome_ext_user_themes",
    name: "GNOME Extension - User Themes",
    category: "gnome_extension",
    description: "Enables applying custom GTK and Shell themes directly from ~/.themes directory.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-ext-user-themes --apply"
  },
  {
    id: "fedora_gnome_extension_manager",
    name: "GNOME Extension Manager (GUI)",
    category: "gnome_extension",
    description: "Native desktop application for searching, installing, and updating GNOME Shell extensions without a browser plugin.",
    requires_root: false,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gnome-extension-manager --apply"
  },
  {
    id: "fedora_gnome_tweaks_extra",
    name: "GNOME Tweaks & Extra Themes Suite",
    category: "optimization",
    description: "Installs GNOME Tweaks for window titlebar buttons (minimize/maximize) and gnome-themes-extra.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-gnome-tweaks-extra --apply"
  },
  {
    id: "fedora_zram_optimization",
    name: "ZRAM Compressed Swap Optimization (ZSTD)",
    category: "optimization",
    description: "Configures zram-generator to use ZSTD compression algorithm for faster compressed RAM swap throughput.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-zram-optimization --apply"
  },
  {
    id: "fedora_gaming_mangohud",
    name: "Gaming Optimization - MangoHud & Lutris",
    category: "optimization",
    description: "Installs MangoHud GPU/CPU performance HUD overlay and Lutris game library manager.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-gaming-mangohud --apply"
  },
  {
    id: "fedora_flatseal_utility",
    name: "Flatseal - Flatpak Permissions Manager",
    category: "optimization",
    description: "Graphical utility to review and modify fine-grained Flatpak permissions (filesystem, network, devices).",
    requires_root: false,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-flatseal-utility --apply"
  },
  {
    id: "fedora_swappiness_tune",
    name: "Swappiness Tuning (vm.swappiness=10)",
    category: "optimization",
    description: "Makes the kernel less eager to swap RAM to disk, for a snappier desktop under memory pressure.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-swappiness-tune --apply"
  },
  {
    id: "fedora_dirty_ratio_tune",
    name: "Write-Back Tuning (dirty_ratio)",
    category: "optimization",
    description: "Flushes dirty pages to disk sooner, reducing multi-second I/O stalls during large file writes.",
    requires_root: true,
    danger_level: "moderate",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-dirty-ratio-tune --apply"
  },
  {
    id: "fedora_inotify_watches",
    name: "Increase Inotify Watch Limit",
    category: "optimization",
    description: "Fixes \"too many open files\" / ENOSPC errors in VS Code and other IDEs watching large repositories.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-inotify-watches --apply"
  },
  {
    id: "fedora_earlyoom",
    name: "earlyoom - Responsive Out-of-Memory Handling",
    category: "optimization",
    description: "Replaces the default systemd-oomd (often too conservative on desktops with many browser tabs) with earlyoom for faster, more responsive OOM recovery.",
    requires_root: true,
    danger_level: "moderate",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-earlyoom --apply"
  },
  {
    id: "fedora_fstrim_timer",
    name: "Periodic SSD TRIM (fstrim.timer)",
    category: "optimization",
    description: "Enables the weekly systemd timer that TRIMs unused SSD blocks, standard modern-distro practice.",
    requires_root: true,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-fstrim-timer --apply"
  },
  {
    id: "fedora_disable_bluetooth",
    name: "Disable Bluetooth Service",
    category: "optimization",
    description: "For systems with no Bluetooth devices -- reduces battery drain and attack surface.",
    requires_root: true,
    danger_level: "moderate",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-disable-bluetooth --apply"
  },
  {
    id: "fedora_disable_cups",
    name: "Disable Printing Service (CUPS)",
    category: "optimization",
    description: "For systems with no printer configured.",
    requires_root: true,
    danger_level: "moderate",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-disable-cups --apply"
  },
  {
    id: "fedora_disable_avahi",
    name: "Disable Network Discovery (Avahi/mDNS)",
    category: "optimization",
    description: "Reduces local-network discovery surface if you don't use AirPrint or LAN service discovery.",
    requires_root: true,
    danger_level: "moderate",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-disable-avahi --apply"
  },
  {
    id: "fedora_gamemode_install",
    name: "Install Feral GameMode",
    category: "optimization",
    description: "Installs the GameMode daemon so games can request temporary CPU/GPU performance optimizations.",
    requires_root: true,
    danger_level: "safe",
    is_applied: true,
    is_applicable: true,
    command: "sudo fedora-gamemode-install --apply"
  },
  {
    id: "fedora_power_profile_performance",
    name: "Switch Power Profile to Performance",
    category: "optimization",
    description: "Switches power-profiles-daemon to the Performance profile for the current session (reversible any time from Safety & Vitals).",
    requires_root: false,
    danger_level: "safe",
    is_applied: false,
    is_applicable: true,
    command: "sudo fedora-power-profile-performance --apply"
  }
];

const mockWindowsTweaks: WindowsTweakItem[] = [
  {
    id: "activity_history",
    name: "Activity History - Disable",
    category: "essential",
    description: "Prevents Windows from storing timeline activities and uploading them to Microsoft servers.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# activity_history registry/service tweak"
  },
  {
    id: "bitlocker",
    name: "BitLocker - Disable",
    category: "essential",
    description: "Disables BitLocker device encryption on drive C: to prevent unexpected recovery key lockouts.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# bitlocker registry/service tweak"
  },
  {
    id: "consumer_features",
    name: "ConsumerFeatures - Disable",
    category: "essential",
    description: "Disables automatic installation of promoted OEM apps and games (Candy Crush, TikTok, etc.).",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# consumer_features registry/service tweak"
  },
  {
    id: "delivery_optimization",
    name: "Delivery Optimization - Disable",
    category: "essential",
    description: "Stops Windows Update from sharing your internet bandwidth with peer computers on the web.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# delivery_optimization registry/service tweak"
  },
  {
    id: "disk_cleanup",
    name: "Disk Cleanup - Run",
    category: "essential",
    description: "Triggers automated silent Windows Disk Cleanup to purge obsolete temporary update files.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# disk_cleanup registry/service tweak"
  },
  {
    id: "end_task_right_click",
    name: "End Task With Right Click - Enable",
    category: "essential",
    description: "Adds an instant 'End Task' option to taskbar app icons (Windows 11 23H2+ only).",
    min_windows_version: 11,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# end_task_right_click registry/service tweak"
  },
  {
    id: "folder_discovery",
    name: "File Explorer Automatic Folder Discovery - Disable",
    category: "essential",
    description: "Disables automatic template sniffing in File Explorer, greatly speeding up browsing large directories.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# folder_discovery registry/service tweak"
  },
  {
    id: "hibernation",
    name: "Hibernation - Disable",
    category: "essential",
    description: "Disables hibernation and deletes C:\\hiberfil.sys, reclaiming 8 to 32 GB of SSD storage.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# hibernation registry/service tweak"
  },
  {
    id: "location_tracking",
    name: "Location Tracking - Disable",
    category: "essential",
    description: "Disables Windows location sensors and geolocation tracking service (lfsvc).",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# location_tracking registry/service tweak"
  },
  {
    id: "store_search_results",
    name: "Microsoft Store Recommended Search Results - Disable",
    category: "essential",
    description: "Removes web search results, Bing queries, and store ads from the Start Menu search box.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# store_search_results registry/service tweak"
  },
  {
    id: "prevent_device_companion",
    name: "Prevent Device Companion Apps",
    category: "essential",
    description: "Blocks Windows from downloading manufacturer companion bloatware when plugging in peripherals.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# prevent_device_companion registry/service tweak"
  },
  {
    id: "restore_point_create",
    name: "Restore Point - Create",
    category: "essential",
    description: "Creates an immutable Windows System Restore checkpoint on drive C: before applying tweaks.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# restore_point_create registry/service tweak"
  },
  {
    id: "services_manual",
    name: "Services - Set to Manual",
    category: "essential",
    description: "Sets unnecessary diagnostic, retail demo, and telemetry services to demand-start (Manual).",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# services_manual registry/service tweak"
  },
  {
    id: "start_menu_previous_layout",
    name: "Start Menu Previous Layout - Enable",
    category: "essential",
    description: "Aligns Start Menu and taskbar icons to the classic left position on Windows 11.",
    min_windows_version: 11,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# start_menu_previous_layout registry/service tweak"
  },
  {
    id: "telemetry",
    name: "Telemetry - Disable",
    category: "essential",
    description: "Disables DiagTrack, Connected User Experiences, and Windows CEIP telemetry.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# telemetry registry/service tweak"
  },
  {
    id: "temp_files_remove",
    name: "Temporary Files - Remove",
    category: "essential",
    description: "Cleans out %TEMP% and C:\\Windows\\Temp without touching active files.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# temp_files_remove registry/service tweak"
  },
  {
    id: "widgets_remove",
    name: "Widgets - Remove",
    category: "essential",
    description: "Disables the Windows 11 taskbar widgets icon and WebExperience news feed background process.",
    min_windows_version: 11,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# widgets_remove registry/service tweak"
  },
  {
    id: "wpbt_disable",
    name: "Windows Platform Binary Table (WPBT) - Disable",
    category: "essential",
    description: "Blocks motherboard firmware from injecting vendor bloatware directly into Windows at boot.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# wpbt_disable registry/service tweak"
  },
  {
    id: "adobe_url_blocklist",
    name: "Adobe URL Block List - Enable",
    category: "advanced_caution",
    description: "Appends known Adobe telemetry and tracking domains to C:\\Windows\\System32\\drivers\\etc\\hosts.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# adobe_url_blocklist registry/service tweak"
  },
  {
    id: "background_apps",
    name: "Background Apps - Disable",
    category: "advanced_caution",
    description: "Disables UWP apps from running and consuming power in the background when minimized.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# background_apps registry/service tweak"
  },
  {
    id: "brave_debloat",
    name: "Brave Browser - Debloat",
    category: "advanced_caution",
    description: "Disables Brave VPN, Crypto Wallet, Rewards, and IPFS via registry group policies.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# brave_debloat registry/service tweak"
  },
  {
    id: "date_time_utc",
    name: "Date & Time - Set Time to UTC",
    category: "advanced_caution",
    description: "Configures Windows hardware clock to UTC (RealTimeIsUniversal).",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# date_time_utc registry/service tweak"
  },
  {
    id: "disable_reserved_storage",
    name: "Disable Reserved Storage",
    category: "advanced_caution",
    description: "Reclaims ~7 GB of hard drive space reserved by Windows for system updates.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# disable_reserved_storage registry/service tweak"
  },
  {
    id: "file_explorer_home_gallery",
    name: "File Explorer Home and Gallery - Disable",
    category: "advanced_caution",
    description: "Hides Gallery from the navigation pane and sets default Explorer startup folder to 'This PC'.",
    min_windows_version: 11,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# file_explorer_home_gallery registry/service tweak"
  },
  {
    id: "ipv6_disable",
    name: "IPv6 - Disable",
    category: "advanced_caution",
    description: "Disables IPv6 protocol bindings across network adapters (use only if your ISP doesn't support IPv6).",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# ipv6_disable registry/service tweak"
  },
  {
    id: "ipv6_prefer_ipv4",
    name: "IPv6 - Set IPv4 as Preferred",
    category: "advanced_caution",
    description: "Prioritizes IPv4 DNS resolution while keeping IPv6 enabled for compatibility.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# ipv6_prefer_ipv4 registry/service tweak"
  },
  {
    id: "logitech_assistant_disable",
    name: "Logitech Download Assistant Auto-Install - Disable",
    category: "advanced_caution",
    description: "Removes Logitech Download Assistant startup autoruns to eliminate recurring popups.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# logitech_assistant_disable registry/service tweak"
  },
  {
    id: "edge_debloat",
    name: "Microsoft Edge - Debloat",
    category: "advanced_caution",
    description: "Disables Edge background startup boost, shopping assistant, sidebar promotions, and telemetry.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# edge_debloat registry/service tweak"
  },
  {
    id: "edge_remove",
    name: "Microsoft Edge - Remove",
    category: "advanced_caution",
    description: "Uninstalls Microsoft Edge browser while safely retaining Edge WebView2 for desktop applications.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "aggressive",
    is_enabled: false,
    is_applicable: true,
    command: "# edge_remove registry/service tweak"
  },
  {
    id: "onedrive_remove",
    name: "Microsoft OneDrive - Remove",
    category: "advanced_caution",
    description: "Unlinks and uninstalls OneDrive, removing its sync folder from the File Explorer sidebar.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "aggressive",
    is_enabled: false,
    is_applicable: true,
    command: "# onedrive_remove registry/service tweak"
  },
  {
    id: "razer_software_disable",
    name: "Razer Software Auto-Install - Disable",
    category: "advanced_caution",
    description: "Prevents Windows from automatically prompting the Razer Synapse installer when plugging in hardware.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# razer_software_disable registry/service tweak"
  },
  {
    id: "rdp_unsigned_warnings",
    name: "RDP Unsigned File Warnings - Disable",
    category: "advanced_caution",
    description: "Suppresses publisher verification warnings when connecting to Remote Desktop sessions.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# rdp_unsigned_warnings registry/service tweak"
  },
  {
    id: "right_click_classic_menu",
    name: "Right-Click Menu Previous Layout - Enable",
    category: "advanced_caution",
    description: "Restores the Windows 10 classic full right-click context menu (bypasses Windows 11 'Show more options').",
    min_windows_version: 11,
    requires_admin: false,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# right_click_classic_menu registry/service tweak"
  },
  {
    id: "storage_sense_disable",
    name: "Storage Sense - Disable",
    category: "advanced_caution",
    description: "Disables automated background deletion of user files in Downloads and Recycle Bin.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# storage_sense_disable registry/service tweak"
  },
  {
    id: "tray_notifications_disable",
    name: "System Tray Notifications & Calendar - Disable",
    category: "advanced_caution",
    description: "Disables action center notification popups and lock screen calendar notifications.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# tray_notifications_disable registry/service tweak"
  },
  {
    id: "teredo_disable",
    name: "Teredo - Disable",
    category: "advanced_caution",
    description: "Disables Microsoft Teredo IPv6 tunneling adapter to reduce network attack surface.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# teredo_disable registry/service tweak"
  },
  {
    id: "visual_effects_performance",
    name: "Visual Effects - Set to Best Performance",
    category: "advanced_caution",
    description: "Disables window drop shadows, fade animations, and smooth scroll for instantaneous responsiveness.",
    min_windows_version: null,
    requires_admin: false,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# visual_effects_performance registry/service tweak"
  },
  {
    id: "windows_ai_remove",
    name: "Windows AI - Disable And Remove",
    category: "advanced_caution",
    description: "Disables Windows Recall snapshots, AI data analysis telemetry, and removes Copilot.",
    min_windows_version: 11,
    requires_admin: true,
    danger_level: "aggressive",
    is_enabled: false,
    is_applicable: true,
    command: "# windows_ai_remove registry/service tweak"
  },
  {
    id: "shutup10_run",
    name: "O&O ShutUp10++ - Run",
    category: "advanced_caution",
    description: "Launches the external O&O ShutUp10++ anti-spy companion tool if installed.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# shutup10_run registry/service tweak"
  },
  {
    id: "disable_sysmain",
    name: "SysMain (Superfetch) - Disable",
    category: "advanced_caution",
    description: "Stops the background service that preloads apps into memory; mainly beneficial on SSD systems.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# disable_sysmain registry/service tweak"
  },
  {
    id: "network_throttling_index",
    name: "Remove Network Throttling Index Cap",
    category: "advanced_caution",
    description: "Removes Windows' default 10,000 packets/sec MMCSS throttle, useful for gaming/streaming.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# network_throttling_index registry/service tweak"
  },
  {
    id: "hags_enable",
    name: "Hardware-Accelerated GPU Scheduling - Enable",
    category: "advanced_caution",
    description: "Moves part of GPU scheduling off the CPU to reduce input latency on modern GPUs. Requires a sign-out or reboot to take effect.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# hags_enable registry/service tweak"
  },
  {
    id: "mouse_acceleration_disable",
    name: "Disable Mouse Acceleration",
    category: "essential",
    description: "Turns off \"Enhance pointer precision\" for consistent 1:1 mouse movement, a standard gaming-precision tweak.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# mouse_acceleration_disable registry/service tweak"
  },
  {
    id: "ultimate_performance_plan",
    name: "Enable Ultimate Performance Power Plan",
    category: "advanced_caution",
    description: "Unlocks Windows' hidden max-performance power scheme. Increases power draw and heat; not recommended for laptops on battery.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: true,
    is_applicable: true,
    command: "# ultimate_performance_plan registry/service tweak"
  },
  {
    id: "search_indexing_disable",
    name: "Disable Windows Search Indexing",
    category: "advanced_caution",
    description: "Reduces background CPU/disk I/O at the cost of slower file search.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "moderate",
    is_enabled: false,
    is_applicable: true,
    command: "# search_indexing_disable registry/service tweak"
  },
  {
    id: "fast_startup_disable",
    name: "Disable Fast Startup",
    category: "essential",
    description: "Fast Startup's hybrid-boot hiberfile is a well-known cause of filesystem corruption on dual-boot Fedora/Windows systems. Distinct from the full Hibernation tweak above.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# fast_startup_disable registry/service tweak"
  },
  {
    id: "gamebar_disable",
    name: "Xbox Game Bar & Game DVR - Disable",
    category: "essential",
    description: "Removes background recording/overlay overhead from Xbox Game Bar.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# gamebar_disable registry/service tweak"
  },
  {
    id: "start_menu_web_search_disable",
    name: "Disable Bing/Web Results in Start Search",
    category: "essential",
    description: "Turns off the Start-menu search box's web/Bing integration -- distinct from the Store Search Results tweak, which covers in-Store suggestions only.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: true,
    is_applicable: true,
    command: "# start_menu_web_search_disable registry/service tweak"
  },
  {
    id: "usb_selective_suspend_disable",
    name: "Disable USB Selective Suspend",
    category: "advanced_caution",
    description: "Reduces peripheral latency/disconnect issues at a small battery-life cost on laptops.",
    min_windows_version: null,
    requires_admin: true,
    danger_level: "safe",
    is_enabled: false,
    is_applicable: true,
    command: "# usb_selective_suspend_disable registry/service tweak"
  }
];

const mockScanResult: ScanResult = {
  timestamp: new Date().toISOString(),
  system_info: {
    os: "linux",
    os_name: "Fedora Linux 43 (Workstation Edition)",
    kernel_version: "7.1.9-100.fc43.x86_64",
    hostname: "mirimomekiku",
    is_elevated: false,
    total_disk_space: 509332160512,
    free_disk_space: 117199298560,
  },
  targets: [
    {
      id: "fedora-dnf-cache",
      name: "DNF / DNF5 Package Cache",
      description: "Removes cached RPM metadata, downloaded headers, and temp database files.",
      category: "package_managers",
      risk_level: "safe",
      requires_elevation: true,
      paths: ["/var/cache/dnf", "/var/cache/libdnf5"],
      estimated_bytes: 112377848, // ~107 MB
      file_count: 84,
      locked_count: 84,
      enabled_by_default: true,
      is_removable: true,
    },
    {
      id: "systemd-journal",
      name: "Systemd Journal Logs (>7 days)",
      description: "Vacuums archived journal logs older than 7 days and limits total log volume to 200MB.",
      category: "system_logs",
      risk_level: "safe",
      requires_elevation: true,
      paths: ["/var/log/journal"],
      estimated_bytes: 1962934272, // ~1.87 GB
      file_count: 100,
      locked_count: 2,
      enabled_by_default: true,
      is_removable: true,
    },
    {
      id: "browser-caches",
      name: "Web Browser Caches (Chrome, Edge, Firefox)",
      description: "Clears temporary HTTP web caches while preserving cookies, bookmarks, and passwords.",
      category: "browser_cache",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.cache/google-chrome/Default/Cache", "~/.cache/mozilla/firefox/*.default*/cache2"],
      estimated_bytes: 1181614080, // ~1.12 GB
      file_count: 37596,
      locked_count: 12,
      enabled_by_default: true,
      is_removable: true,
    },
    {
      id: "linux-user-cache",
      name: "User Thumbnail & Application Caches",
      description: "Clears user thumbnail cache (~/.cache/thumbnails) and temporary desktop application caches.",
      category: "system_temp",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.cache/thumbnails", "~/.cache/media-art"],
      estimated_bytes: 483082240, // ~460 MB
      file_count: 8160,
      locked_count: 0,
      enabled_by_default: true,
      is_removable: true,
    },
    {
      id: "linux-trash",
      name: "User Trash Bin",
      description: "Permanently purges files inside the desktop user trash folder (~/.local/share/Trash).",
      category: "user_trash",
      risk_level: "moderate",
      requires_elevation: false,
      paths: ["~/.local/share/Trash"],
      estimated_bytes: 47169466368, // ~44 GB
      file_count: 62903,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "linux-old-kernels",
      name: "Old / Unused Linux Kernels",
      description: "Prunes obsolete installed kernels while strictly preserving active running & N-1 fallback kernels.",
      category: "old_kernels",
      risk_level: "moderate",
      requires_elevation: true,
      paths: ["/boot/vmlinuz-*"],
      estimated_bytes: 419430400, // ~400 MB
      file_count: 2,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-python-cache",
      name: "Python Ecosystem (pip, uv, Poetry, Conda)",
      description: "Cleans cached pip download wheels, uv packages, Poetry artifacts, and conda package archives.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.cache/pip", "~/.cache/uv", "~/.cache/pypoetry", "~/.conda/pkgs"],
      estimated_bytes: 3420194048, // ~3.4 GB
      file_count: 5410,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-modern-js-cache",
      name: "Modern JS Ecosystem (npm, pnpm, Yarn, Bun, Deno)",
      description: "Prunes global npm cache, pnpm content-addressable store, Bun cache, and Deno runtime downloads.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.npm/_cacache", "~/.local/share/pnpm/store", "~/.yarn/cache", "~/.bun/install/cache"],
      estimated_bytes: 8520194048, // ~8.1 GB
      file_count: 20246,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-podman-cache",
      name: "Containers & Podman Storage (Podman / Docker)",
      description: "Prunes inactive Podman containers, temporary rootless storage overlays, and build layers.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.local/share/containers/storage/tmp", "~/.local/share/containers/cache"],
      estimated_bytes: 12400000000, // ~12.4 GB
      file_count: 890,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-compiler-cache",
      name: "C / C++ / Rust Compilers (ccache, sccache, Cargo & Rustup)",
      description: "Cleans pre-compiled C/C++ compilation caches (ccache/sccache), Rust crate tarballs, git indices, and Rustup toolchain downloads.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.cache/ccache", "~/.cargo/registry/cache", "~/.cargo/git/db", "~/.rustup/downloads"],
      estimated_bytes: 5120000000, // ~5.1 GB
      file_count: 3120,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-jvm-cache",
      name: "JVM Build Systems (Maven, Gradle, sbt)",
      description: "Sweeps cached Maven repository artifacts, Gradle build-cache payloads, and Coursier/sbt dependency jars.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/.m2/repository", "~/.gradle/caches", "~/.cache/coursier"],
      estimated_bytes: 6840000000, // ~6.8 GB
      file_count: 14200,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
    {
      id: "dev-go-cache",
      name: "Go Module & Build Cache",
      description: "Cleans Go compiler build cache and cached module zip downloads.",
      category: "dev_caches",
      risk_level: "safe",
      requires_elevation: false,
      paths: ["~/go/pkg/mod/cache", "~/.cache/go-build"],
      estimated_bytes: 2100000000, // ~2.1 GB
      file_count: 4300,
      locked_count: 0,
      enabled_by_default: false,
      is_removable: true,
    },
  ],
  total_reclaimable_bytes: 59430000000,
  total_files: 129074,
  total_locked: 98,
};

export const bridge = {
  async scanAll(): Promise<ScanResult> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("scan_all");
      return ScanResultSchema.parse(raw);
    }
    // Web fallback simulation
    await new Promise((r) => setTimeout(r, 600));
    return mockScanResult;
  },

  async executeClean(plan: CleanExecutionPlan): Promise<CleanExecutionResult> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("execute_clean", { plan });
      return CleanExecutionResultSchema.parse(raw);
    }
    // Web simulation
    await new Promise((r) => setTimeout(r, 900));
    const selected = mockScanResult.targets.filter((t) => plan.target_ids.includes(t.id));
    const freed = selected.reduce((acc, t) => acc + t.estimated_bytes, 0);
    const files = selected.reduce((acc, t) => acc + t.file_count, 0);

    return {
      audit_id: `audit-${Date.now()}`,
      freed_bytes: plan.dry_run ? 0 : freed,
      deleted_files: plan.dry_run ? 0 : files,
      skipped_files: 12,
      errors: [],
      snapshot_id: plan.create_snapshot ? `btrfs-snap-${Date.now()}` : null,
      success: true,
    };
  },

  async getSnapshotStatus(): Promise<SnapshotStatus> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_snapshot_status");
      return SnapshotStatusSchema.parse(raw);
    }
    return {
      is_available: true,
      provider_name: "Snapper (Btrfs)",
      last_snapshot: "snapshot-20260906-clean",
      details: "Btrfs subvolume snapshot active and ready for non-destructive rollbacks.",
    };
  },

  /** Takes a real, on-demand safety snapshot right now (Snapper/Timeshift on
   * Linux, a VSS System Restore point on Windows) instead of only ever
   * getting one as a side effect of a clean. Returns the resulting
   * snapshot/checkpoint id. */
  async createManualSnapshot(): Promise<string> {
    if (isTauri() || isElectron()) {
      return await invokeNative<string>("create_manual_snapshot");
    }
    await new Promise((r) => setTimeout(r, 900));
    return `btrfs-snap-${Date.now()}`;
  },

  async getWindowsUpdateState(): Promise<WindowsUpdateState> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_windows_update_state");
      return WindowsUpdateStateSchema.parse(raw);
    }
    return {
      services_disabled: false,
      gpo_policies_active: false,
      scheduled_tasks_disabled: false,
      metered_network_shield: false,
      fully_disabled: false,
    };
  },

  async setWindowsUpdates(disabled: boolean): Promise<boolean> {
    if (isTauri() || isElectron()) {
      return await invokeNative<boolean>("set_windows_updates", { disabled, profile: disabled ? "disable" : "default" });
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  async setWindowsUpdateProfile(profile: "recommended" | "default" | "disable"): Promise<boolean> {
    if (isTauri() || isElectron()) {
      return await invokeNative<boolean>("set_windows_updates", { disabled: profile === "disable", profile });
    }
    await new Promise((r) => setTimeout(r, 500));
    return true;
  },

  async executeLinuxTweak(tweakName: string): Promise<string> {
    if (isTauri() || isElectron()) {
      return await invokeNative<string>("execute_linux_tweak", { tweakName });
    }
    await new Promise((r) => setTimeout(r, 600));
    return `Executed ${tweakName} successfully (Simulation)`;
  },

  async getAuditHistory(): Promise<AuditEntry[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_audit_history");
      return z.array(AuditEntrySchema).parse(raw);
    }
    // Return a copy so callers can't mutate the shared mock store directly;
    // rollbackSnapshot below is the only thing allowed to change it.
    return mockAuditEntries.map((entry) => ({ ...entry }));
  },

  /** Restores files and settings to the pre-operation snapshot checkpoint
   * recorded for this audit entry. Real rollback, not a logged no-op. */
  async rollbackSnapshot(auditId: string): Promise<string> {
    if (isTauri() || isElectron()) {
      return await invokeNative<string>("rollback_snapshot", { auditId });
    }
    await new Promise((r) => setTimeout(r, 900));
    const entry = mockAuditEntries.find((e) => e.id === auditId);
    if (!entry) {
      throw new Error(`No audit entry found for transaction ${auditId}.`);
    }
    if (entry.is_rolled_back) {
      throw new Error(`Transaction ${auditId} has already been rolled back.`);
    }
    if (!entry.snapshot_id) {
      throw new Error(`Transaction ${auditId} has no associated snapshot to restore from.`);
    }
    entry.is_rolled_back = true;
    return `Restored ${entry.target_ids.length} target(s) from snapshot ${entry.snapshot_id}.`;
  },

  async getWindowsTweaks(): Promise<WindowsTweakItem[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_windows_tweaks");
      return z.array(WindowsTweakItemSchema).parse(raw);
    }
    return mockWindowsTweaks.map((t) => ({ ...t }));
  },

  async getWindowsVersionInfo(): Promise<WindowsVersionInfo> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_windows_version_info");
      return WindowsVersionInfoSchema.parse(raw);
    }
    return {
      version: 11,
      build_number: 22631,
      display_name: "Windows 11 Pro (23H2, Build 22631)",
    };
  },

  async applyWindowsTweaks(ids: string[], restorePoint: boolean): Promise<TweakActionReport[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("apply_windows_tweaks", { ids, restorePoint });
      return z.array(TweakActionReportSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 800));
    return ids.map((id) => ({
      name: id,
      succeeded: true,
      details: "Tweak applied successfully (Simulation)",
    }));
  },

  async getDnsInfo(): Promise<DnsInfo> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_dns_info");
      return DnsInfoSchema.parse(raw);
    }
    return {
      current_preset: "google",
      servers: ["8.8.8.8", "8.8.4.4"],
      display_name: "Google DNS (8.8.8.8)",
    };
  },

  async setDns(preset: string): Promise<TweakActionReport> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("set_dns", { preset });
      return TweakActionReportSchema.parse(raw);
    }
    await new Promise((r) => setTimeout(r, 400));
    return {
      name: `DNS: ${preset}`,
      succeeded: true,
      details: `DNS updated to preset: ${preset} (Simulation)`,
    };
  },

  async getLinuxTweaks(): Promise<LinuxTweakItem[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_linux_tweaks");
      return z.array(LinuxTweakItemSchema).parse(raw);
    }
    return mockLinuxTweaks.map((t) => ({ ...t }));
  },

  async applyLinuxTweaks(ids: string[]): Promise<TweakActionReport[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("apply_linux_tweaks", { ids });
      return z.array(TweakActionReportSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 800));
    return ids.map((id) => ({
      name: id,
      succeeded: true,
      details: "Fedora tweak applied successfully (Simulation)",
    }));
  },

  async getAppsCatalog(): Promise<AppDefinition[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_apps_catalog");
      return z.array(AppDefinitionSchema).parse(raw);
    }
    return [];
  },

  async installApps(ids: string[], backend?: string): Promise<TweakActionReport[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("install_apps", { ids, backend });
      return z.array(TweakActionReportSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 1200));
    return ids.map((id) => ({
      name: `Install ${id}`,
      succeeded: true,
      details: `App ${id} installed successfully (Simulation)`,
    }));
  },

  async uninstallApp(id: string): Promise<TweakActionReport> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("uninstall_app", { id });
      return TweakActionReportSchema.parse(raw);
    }
    await new Promise((r) => setTimeout(r, 600));
    return {
      name: `Uninstall ${id}`,
      succeeded: true,
      details: `App ${id} uninstalled successfully (Simulation)`,
    };
  },

  async uninstallApps(ids: string[]): Promise<TweakActionReport[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("uninstall_apps", { ids });
      return z.array(TweakActionReportSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 800));
    return ids.map((id) => ({
      name: `Uninstall ${id}`,
      succeeded: true,
      details: `App ${id} uninstalled successfully (Simulation)`,
    }));
  },

  async getInstalledAppUsage(): Promise<InstalledAppUsage[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_installed_app_usage");
      return z.array(InstalledAppUsageSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 500));
    return [
      { id: "discord", name: "Discord", category: "communication", install_size_bytes: 420000000, last_used_days_ago: 2, is_installed: true },
      { id: "vscode", name: "Visual Studio Code", category: "development", install_size_bytes: 380000000, last_used_days_ago: 0, is_installed: true },
      { id: "steam", name: "Steam", category: "gaming", install_size_bytes: 1200000000, last_used_days_ago: 5, is_installed: true },
      { id: "gimp", name: "GIMP", category: "media_tools", install_size_bytes: 610000000, last_used_days_ago: 143, is_installed: true },
      { id: "blender", name: "Blender", category: "media_tools", install_size_bytes: 1450000000, last_used_days_ago: 208, is_installed: true },
      { id: "android_studio", name: "Android Studio", category: "development", install_size_bytes: 3800000000, last_used_days_ago: 172, is_installed: true },
      { id: "libreoffice", name: "LibreOffice", category: "utilities", install_size_bytes: 890000000, last_used_days_ago: 96, is_installed: true },
      { id: "obs_studio", name: "OBS Studio", category: "media_tools", install_size_bytes: 340000000, last_used_days_ago: 61, is_installed: true },
      { id: "postman", name: "Postman", category: "development", install_size_bytes: 512000000, last_used_days_ago: 265, is_installed: true },
    ];
  },

  async getXRay(targetPath?: string): Promise<XRayReport> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_xray", { targetPath });
      return XRayReportSchema.parse(raw);
    }
    await new Promise((r) => setTimeout(r, 600));
    return {
      root_path: targetPath || "/home/user",
      total_scanned_bytes: 142500000000,
      total_files: 85200,
      by_category: {
        build_cache: 48500000000,
        video: 36200000000,
        archives_installers: 28400000000,
        images: 12800000000,
        documents: 6400000000,
        other: 10200000000,
      },
      top_folders: [
        { name: "node_modules & target", path: "~/Projects", size_bytes: 38200000000, file_count: 54100, percentage: 26.8 },
        { name: "Videos & Screen Captures", path: "~/Videos", size_bytes: 34100000000, file_count: 142, percentage: 23.9 },
        { name: "Downloads Archive", path: "~/Downloads", size_bytes: 26400000000, file_count: 820, percentage: 18.5 },
        { name: "Flatpak Storage", path: "~/.var/app", size_bytes: 18200000000, file_count: 14200, percentage: 12.8 },
        { name: "Containers & Podman", path: "~/.local/share/containers", size_bytes: 12400000000, file_count: 2400, percentage: 8.7 },
      ],
      largest_files: [
        { name: "Fedora-Workstation-Live-44.iso", path: "~/Downloads/Fedora-Workstation-Live-44.iso", size_bytes: 2420000000, category: "archives_installers", modified_time: "2026-09-02 14:20" },
        { name: "dev-recording-4k.mp4", path: "~/Videos/dev-recording-4k.mp4", size_bytes: 1850000000, category: "video", modified_time: "2026-09-04 18:12" },
        { name: "windows-11-enterprise.iso", path: "~/Downloads/windows-11-enterprise.iso", size_bytes: 5600000000, category: "archives_installers", modified_time: "2026-08-28 09:44" },
        { name: "cargo-target-release-debug", path: "~/Projects/miri-cleaner/target", size_bytes: 1240000000, category: "build_cache", modified_time: "2026-09-06 12:00" },
      ],
    };
  },

  async getLeftovers(): Promise<AppLeftover[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_leftovers");
      return z.array(AppLeftoverSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 500));
    return [
      {
        id: "flatpak-com.valvesoftware.Steam",
        app_name: "com.valvesoftware.Steam (Flatpak Orphan)",
        paths: ["~/.var/app/com.valvesoftware.Steam"],
        total_bytes: 4290000000,
        file_count: 1420,
        source: "flatpak_orphan",
        risk_level: "safe",
        is_removable: true,
      },
      {
        id: "flatpak-org.blender.Blender",
        app_name: "org.blender.Blender (Flatpak Orphan)",
        paths: ["~/.var/app/org.blender.Blender"],
        total_bytes: 1850000000,
        file_count: 820,
        source: "flatpak_orphan",
        risk_level: "safe",
        is_removable: true,
      },
      {
        id: "flatpak-com.discordapp.Discord",
        app_name: "com.discordapp.Discord (Flatpak Orphan)",
        paths: ["~/.var/app/com.discordapp.Discord/cache"],
        total_bytes: 680000000,
        file_count: 450,
        source: "flatpak_orphan",
        risk_level: "safe",
        is_removable: true,
      },
    ];
  },

  async cleanLeftovers(): Promise<{ success: boolean; details: string }> {
    if (isTauri() || isElectron()) {
      return await invokeNative<{ success: boolean; details: string }>("clean_leftovers");
    }
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, details: "Purged 6.82 GB of orphaned application caches." };
  },

  async getAutostart(): Promise<AutostartItem[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_autostart");
      return z.array(AutostartItemSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 400));
    // Return a copy so callers can't mutate the shared mock store directly;
    // toggleAutostart below is the only thing allowed to change it.
    return mockAutostartItems.map((item) => ({ ...item }));
  },

  async toggleAutostart(filePath: string, enable: boolean): Promise<{ success: boolean; details: string }> {
    if (isTauri() || isElectron()) {
      return await invokeNative<{ success: boolean; details: string }>("toggle_autostart", { filePath, enable });
    }
    await new Promise((r) => setTimeout(r, 400));
    const item = mockAutostartItems.find((a) => a.file_path === filePath);
    if (!item) {
      throw new Error(`No autostart entry found at ${filePath}.`);
    }
    item.enabled = enable;
    return { success: true, details: `${item.name} autostart ${enable ? "enabled" : "disabled"}.` };
  },

  async getDuplicates(targetPath?: string): Promise<DuplicateGroup[]> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown[]>("get_duplicates", { targetPath });
      return z.array(DuplicateGroupSchema).parse(raw);
    }
    await new Promise((r) => setTimeout(r, 700));
    return [
      {
        group_id: "dup-1",
        file_size: 1450000000,
        count: 2,
        wasted_bytes: 1450000000,
        can_reflink: true,
        files: [
          { path: "~/Downloads/ubuntu-desktop.iso", modified_time: "2026-08-15 11:20", is_original: true },
          { path: "~/Documents/ISOs/ubuntu-desktop-copy.iso", modified_time: "2026-08-20 16:44", is_original: false },
        ],
      },
      {
        group_id: "dup-2",
        file_size: 420000000,
        count: 3,
        wasted_bytes: 840000000,
        can_reflink: true,
        files: [
          { path: "~/Downloads/dataset-archive-v1.tar.gz", modified_time: "2026-09-01 08:30", is_original: true },
          { path: "~/Projects/data/dataset-archive-v1.tar.gz", modified_time: "2026-09-02 10:15", is_original: false },
          { path: "~/Downloads/dataset-archive-v1 (1).tar.gz", modified_time: "2026-09-03 14:22", is_original: false },
        ],
      },
    ];
  },

  async reflinkDuplicates(targetPath?: string): Promise<{ success: boolean; details: string }> {
    if (isTauri() || isElectron()) {
      return await invokeNative<{ success: boolean; details: string }>("reflink_duplicates", { targetPath });
    }
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, details: "Reflinked duplicate files using Btrfs CoW! Extents are now shared without deleting files." };
  },

  async getVitals(): Promise<SystemVitalsReport> {
    if (isTauri() || isElectron()) {
      const raw = await invokeNative<unknown>("get_vitals");
      return SystemVitalsReportSchema.parse(raw);
    }
    await new Promise((r) => setTimeout(r, 400));
    return {
      battery: {
        percentage: 94,
        status: "Discharging",
        cycle_count: 42,
        health_percentage: 98,
        power_source: "Battery",
      },
      power_profile: {
        active_profile: "balanced",
        available_profiles: ["performance", "balanced", "power-saver"],
      },
      disk_health: {
        filesystem: "Btrfs",
        total_gb: 512.0,
        used_gb: 184.2,
        free_gb: 327.8,
        is_btrfs: true,
        trim_supported: true,
      },
      snapshot_compactor: {
        provider: "Snapper (Btrfs)",
        total_snapshots: 8,
        older_than_14d_count: 3,
        older_than_30d_count: 1,
        estimated_reclaimable_mb: 21400,
      },
    };
  },

  async compactSnapshots(days: number): Promise<string> {
    if (isTauri() || isElectron()) {
      return await invokeNative<string>("compact_snapshots", { days });
    }
    await new Promise((r) => setTimeout(r, 900));
    return `Compacted snapshots older than ${days} days. Reclaimed ~21.4 GB.`;
  },

  async setPowerProfile(profile: string): Promise<string> {
    if (isTauri() || isElectron()) {
      return await invokeNative<string>("set_power_profile", { profile });
    }
    await new Promise((r) => setTimeout(r, 400));
    return `Switched power profile to: ${profile}`;
  },
};
