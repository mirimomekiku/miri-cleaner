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
  FileProperties,
  FilePropertiesSchema,
  DiskHealthReport,
  DiskHealthReportSchema,
  BigFileQuery,
  BigFileReport,
  BigFileReportSchema,
  BrowserCleanupReport,
  BrowserCleanupReportSchema,
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

/** Invokes a native command and validates its result against a zod schema
 * in one step -- the shared shape behind most `bridge` functions, which
 * would otherwise each repeat `const raw = await invokeNative(...); return
 * Schema.parse(raw);` verbatim. Functions returning a bare primitive/plain
 * object with no schema (deletePath, revealInFileManager, ...) call
 * `invokeNative` directly instead; that's a genuinely different shape, not
 * this pattern repeated. */
async function invokeParsed<T>(
  cmd: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>
): Promise<T> {
  const raw = await invokeNative<unknown>(cmd, args);
  return schema.parse(raw);
}

/** Same as `invokeParsed`, for commands whose result is a JSON array. */
async function invokeParsedArray<T>(
  cmd: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>
): Promise<T[]> {
  const raw = await invokeNative<unknown[]>(cmd, args);
  return z.array(schema).parse(raw);
}

export const bridge = {
  async scanAll(): Promise<ScanResult> {
    return invokeParsed("scan_all", ScanResultSchema);
  },

  async executeClean(plan: CleanExecutionPlan): Promise<CleanExecutionResult> {
    return invokeParsed("execute_clean", CleanExecutionResultSchema, { plan });
  },

  async getSnapshotStatus(): Promise<SnapshotStatus> {
    return invokeParsed("get_snapshot_status", SnapshotStatusSchema);
  },

  /** Takes a real, on-demand safety snapshot right now (Snapper/Timeshift on
   * Linux, a VSS System Restore point on Windows) instead of only ever
   * getting one as a side effect of a clean. Returns the resulting
   * snapshot/checkpoint id. */
  async createManualSnapshot(): Promise<string> {
    return await invokeNative<string>("create_manual_snapshot");
  },

  async getWindowsUpdateState(): Promise<WindowsUpdateState> {
    return invokeParsed("get_windows_update_state", WindowsUpdateStateSchema);
  },

  async setWindowsUpdates(disabled: boolean): Promise<boolean> {
    return await invokeNative<boolean>("set_windows_updates", { disabled, profile: disabled ? "disable" : "default" });
  },

  async setWindowsUpdateProfile(profile: "recommended" | "default" | "disable"): Promise<boolean> {
    return await invokeNative<boolean>("set_windows_updates", { disabled: profile === "disable", profile });
  },

  async executeLinuxTweak(tweakName: string): Promise<string> {
    return await invokeNative<string>("execute_linux_tweak", { tweakName });
  },

  async getAuditHistory(): Promise<AuditEntry[]> {
    return invokeParsedArray("get_audit_history", AuditEntrySchema);
  },

  /** Restores files and settings to the pre-operation snapshot checkpoint
   * recorded for this audit entry. Real rollback, not a logged no-op. */
  async rollbackSnapshot(auditId: string): Promise<string> {
    return await invokeNative<string>("rollback_snapshot", { auditId });
  },

  async getWindowsTweaks(): Promise<WindowsTweakItem[]> {
    return invokeParsedArray("get_windows_tweaks", WindowsTweakItemSchema);
  },

  async getWindowsVersionInfo(): Promise<WindowsVersionInfo> {
    return invokeParsed("get_windows_version_info", WindowsVersionInfoSchema);
  },

  async applyWindowsTweaks(ids: string[], restorePoint: boolean): Promise<TweakActionReport[]> {
    return invokeParsedArray("apply_windows_tweaks", TweakActionReportSchema, { ids, restorePoint });
  },

  async getDnsInfo(): Promise<DnsInfo> {
    return invokeParsed("get_dns_info", DnsInfoSchema);
  },

  async setDns(preset: string): Promise<TweakActionReport> {
    return invokeParsed("set_dns", TweakActionReportSchema, { preset });
  },

  async getLinuxTweaks(): Promise<LinuxTweakItem[]> {
    return invokeParsedArray("get_linux_tweaks", LinuxTweakItemSchema);
  },

  async applyLinuxTweaks(ids: string[]): Promise<TweakActionReport[]> {
    return invokeParsedArray("apply_linux_tweaks", TweakActionReportSchema, { ids });
  },

  async getAppsCatalog(): Promise<AppDefinition[]> {
    return invokeParsedArray("get_apps_catalog", AppDefinitionSchema);
  },

  async installApps(ids: string[], backend?: string): Promise<TweakActionReport[]> {
    return invokeParsedArray("install_apps", TweakActionReportSchema, { ids, backend });
  },

  async uninstallApp(id: string): Promise<TweakActionReport> {
    return invokeParsed("uninstall_app", TweakActionReportSchema, { id });
  },

  async uninstallApps(ids: string[]): Promise<TweakActionReport[]> {
    return invokeParsedArray("uninstall_apps", TweakActionReportSchema, { ids });
  },

  async getInstalledAppUsage(): Promise<InstalledAppUsage[]> {
    return invokeParsedArray("get_installed_app_usage", InstalledAppUsageSchema);
  },

  async getXRay(targetPath?: string): Promise<XRayReport> {
    return invokeParsed("get_xray", XRayReportSchema, { targetPath });
  },

  async getLeftovers(): Promise<AppLeftover[]> {
    return invokeParsedArray("get_leftovers", AppLeftoverSchema);
  },

  async cleanLeftovers(): Promise<{ success: boolean; details: string }> {
    return await invokeNative<{ success: boolean; details: string }>("clean_leftovers");
  },

  async getAutostart(): Promise<AutostartItem[]> {
    return invokeParsedArray("get_autostart", AutostartItemSchema);
  },

  async toggleAutostart(filePath: string, enable: boolean): Promise<{ success: boolean; details: string }> {
    return await invokeNative<{ success: boolean; details: string }>("toggle_autostart", { filePath, enable });
  },

  async getDuplicates(targetPath?: string): Promise<DuplicateGroup[]> {
    return invokeParsedArray("get_duplicates", DuplicateGroupSchema, { targetPath });
  },

  async reflinkDuplicates(targetPath?: string): Promise<{ success: boolean; details: string }> {
    return await invokeNative<{ success: boolean; details: string }>("reflink_duplicates", { targetPath });
  },

  /** Moves a single file or folder to the OS trash/recycle bin (never a
   * permanent delete) for the Storage & Duplicates right-click menu. */
  async deletePath(path: string): Promise<{ success: boolean; details: string }> {
    return await invokeNative<{ success: boolean; details: string }>("delete_path", { path });
  },

  /** Opens the platform file manager with the given path pre-selected
   * (Explorer on Windows, Nautilus on Fedora/GNOME). */
  async revealInFileManager(path: string): Promise<void> {
    await invokeNative<void>("reveal_in_file_manager", { path });
  },

  /** Reads file/folder metadata for the in-app Properties panel. */
  async getFileProperties(path: string): Promise<FileProperties> {
    return invokeParsed("get_file_properties", FilePropertiesSchema, { path });
  },

  async getVitals(): Promise<SystemVitalsReport> {
    return invokeParsed("get_vitals", SystemVitalsReportSchema);
  },

  async compactSnapshots(days: number): Promise<string> {
    return await invokeNative<string>("compact_snapshots", { days });
  },

  async setPowerProfile(profile: string): Promise<string> {
    return await invokeNative<string>("set_power_profile", { profile });
  },

  /** Unprivileged SMART read. */
  async getDiskHealth(): Promise<DiskHealthReport> {
    return invokeParsed("get_disk_health", DiskHealthReportSchema);
  },

  /** Re-reads SMART data with an elevation prompt (pkexec/UAC), for when
   * the unprivileged read above is refused. */
  async getDiskHealthElevated(): Promise<DiskHealthReport> {
    return invokeParsed("get_disk_health_elevated", DiskHealthReportSchema);
  },

  /** Filtered big-file finder (size/category/age/last-opened). */
  async findBigFiles(query: BigFileQuery): Promise<BigFileReport> {
    return invokeParsed("find_big_files", BigFileReportSchema, { query });
  },

  /** Per-browser, per-data-type storage breakdown (cache vs. cookies vs.
   * site storage). */
  async scanBrowserData(): Promise<BrowserCleanupReport> {
    return invokeParsed("scan_browser_data", BrowserCleanupReportSchema);
  },

  /** Moves every path in a browser data category to the trash (never a
   * permanent delete). */
  async clearBrowserData(paths: string[]): Promise<{ success: boolean; details: string }> {
    return await invokeNative<{ success: boolean; details: string }>("clear_browser_data", { paths });
  },

  /** Shows a native OS notification (notify-rust/D-Bus & Windows toast on
   * Tauri, Electron's Notification module on the Electron shell). Prefer
   * the `notify()` helper in lib/notify.ts over calling this directly --
   * it applies the user's Settings preferences first. */
  async showNotification(title: string, body: string): Promise<void> {
    await invokeNative<void>("show_notification", { title, body });
  },
};
