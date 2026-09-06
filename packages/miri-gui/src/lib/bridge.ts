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
    return [];
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
    return [];
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
    return [
      { id: "discord.desktop", name: "Discord", command: "flatpak run com.discordapp.Discord", enabled: true, file_path: "~/.config/autostart/discord.desktop", impact: "high", source: "user_autostart" },
      { id: "steam.desktop", name: "Steam Client", command: "steam -silent", enabled: true, file_path: "~/.config/autostart/steam.desktop", impact: "high", source: "user_autostart" },
      { id: "spotify.desktop", name: "Spotify", command: "spotify --minimized", enabled: false, file_path: "~/.config/autostart/spotify.desktop", impact: "medium", source: "user_autostart" },
      { id: "nextcloud.desktop", name: "Nextcloud Desktop", command: "nextcloud --background", enabled: true, file_path: "~/.config/autostart/nextcloud.desktop", impact: "medium", source: "user_autostart" },
      { id: "gamemode.desktop", name: "Feral GameMode Indicator", command: "gamemoded", enabled: true, file_path: "/etc/xdg/autostart/gamemoded.desktop", impact: "low", source: "system_autostart" },
    ];
  },

  async toggleAutostart(filePath: string, enable: boolean): Promise<{ success: boolean; details: string }> {
    if (isTauri() || isElectron()) {
      return await invokeNative<{ success: boolean; details: string }>("toggle_autostart", { filePath, enable });
    }
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, details: `Autostart set to ${enable}` };
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
