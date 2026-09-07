import { z } from "zod";

export const OsTypeSchema = z.enum(["linux", "windows", "macos", "unknown"]);
export type OsType = z.infer<typeof OsTypeSchema>;

export const RiskLevelSchema = z.enum(["safe", "moderate", "aggressive", "dangerous"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const CleanCategorySchema = z.enum([
  "system_temp",
  "browser_cache",
  "package_managers",
  "system_logs",
  "old_kernels",
  "dev_caches",
  "windows_update",
  "user_trash",
]);
export type CleanCategory = z.infer<typeof CleanCategorySchema>;

export const CleanTargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: CleanCategorySchema,
  risk_level: RiskLevelSchema,
  requires_elevation: z.boolean(),
  paths: z.array(z.string()),
  estimated_bytes: z.number(),
  file_count: z.number(),
  locked_count: z.number(),
  enabled_by_default: z.boolean(),
  is_removable: z.boolean(),
});
export type CleanTarget = z.infer<typeof CleanTargetSchema>;

export const SystemInfoSchema = z.object({
  os: OsTypeSchema,
  os_name: z.string(),
  kernel_version: z.string(),
  hostname: z.string(),
  is_elevated: z.boolean(),
  total_disk_space: z.number(),
  free_disk_space: z.number(),
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const ScanResultSchema = z.object({
  timestamp: z.string(),
  system_info: SystemInfoSchema,
  targets: z.array(CleanTargetSchema),
  total_reclaimable_bytes: z.number(),
  total_files: z.number(),
  total_locked: z.number(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

export const CleanExecutionPlanSchema = z.object({
  target_ids: z.array(z.string()),
  dry_run: z.boolean(),
  create_snapshot: z.boolean(),
});
export type CleanExecutionPlan = z.infer<typeof CleanExecutionPlanSchema>;

export const CleanExecutionResultSchema = z.object({
  audit_id: z.string(),
  freed_bytes: z.number(),
  deleted_files: z.number(),
  skipped_files: z.number(),
  errors: z.array(z.string()),
  snapshot_id: z.string().nullable(),
  success: z.boolean(),
});
export type CleanExecutionResult = z.infer<typeof CleanExecutionResultSchema>;

export const SnapshotStatusSchema = z.object({
  is_available: z.boolean(),
  provider_name: z.string(),
  last_snapshot: z.string().nullable(),
  details: z.string(),
});
export type SnapshotStatus = z.infer<typeof SnapshotStatusSchema>;

export const WindowsUpdateStateSchema = z.object({
  services_disabled: z.boolean(),
  gpo_policies_active: z.boolean(),
  scheduled_tasks_disabled: z.boolean(),
  metered_network_shield: z.boolean(),
  fully_disabled: z.boolean(),
  active_profile: z.string().optional().nullable(),
});
export type WindowsUpdateState = z.infer<typeof WindowsUpdateStateSchema>;

export const AuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  operation: z.string(),
  target_ids: z.array(z.string()),
  freed_bytes: z.number(),
  snapshot_id: z.string().nullable(),
  rollback_payload: z.record(z.string(), z.string()),
  is_rolled_back: z.boolean(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const WindowsTweakCategorySchema = z.enum(["essential", "advanced_caution"]);
export type WindowsTweakCategory = z.infer<typeof WindowsTweakCategorySchema>;

export const WindowsVersionInfoSchema = z.object({
  version: z.number(),
  build_number: z.number(),
  display_name: z.string(),
});
export type WindowsVersionInfo = z.infer<typeof WindowsVersionInfoSchema>;

export const WindowsTweakItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: WindowsTweakCategorySchema,
  description: z.string(),
  min_windows_version: z.number().nullable(),
  requires_admin: z.boolean(),
  danger_level: RiskLevelSchema,
  is_enabled: z.boolean(),
  is_applicable: z.boolean(),
  command: z.string().optional(),
});
export type WindowsTweakItem = z.infer<typeof WindowsTweakItemSchema>;

export const LinuxTweakCategorySchema = z.enum(["essential", "optimization", "gnome_extension"]);
export type LinuxTweakCategory = z.infer<typeof LinuxTweakCategorySchema>;

export const LinuxTweakItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: LinuxTweakCategorySchema,
  description: z.string(),
  requires_root: z.boolean(),
  danger_level: RiskLevelSchema,
  is_applied: z.boolean(),
  is_applicable: z.boolean(),
  command: z.string(),
});
export type LinuxTweakItem = z.infer<typeof LinuxTweakItemSchema>;

export const DnsInfoSchema = z.object({
  current_preset: z.string(),
  servers: z.array(z.string()),
  display_name: z.string(),
});
export type DnsInfo = z.infer<typeof DnsInfoSchema>;

export const TweakActionReportSchema = z.object({
  name: z.string(),
  succeeded: z.boolean(),
  details: z.string(),
});
export type TweakActionReport = z.infer<typeof TweakActionReportSchema>;

export const AppCategorySchema = z.enum([
  "browsers",
  "communication",
  "development",
  "gaming",
  "media_tools",
  "utilities",
  "privacy",
]);
export type AppCategory = z.infer<typeof AppCategorySchema>;

export const AppDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: AppCategorySchema,
  description: z.string(),
  windows_winget_id: z.string(),
  linux_flatpak_id: z.string(),
  linux_dnf_package: z.string().nullable(),
  is_installed: z.boolean(),
});
export type AppDefinition = z.infer<typeof AppDefinitionSchema>;

// Usage-based uninstall suggestions: installed apps the user hasn't
// actually launched in a while, distinct from AppDefinition's static
// catalog entries (which cover the "get apps" installer flow instead).
export const InstalledAppUsageSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: AppCategorySchema,
  install_size_bytes: z.number(),
  last_used_days_ago: z.number(),
  is_installed: z.boolean(),
});
export type InstalledAppUsage = z.infer<typeof InstalledAppUsageSchema>;

// 1. Space X-Ray
export const XRayFileItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  size_bytes: z.number(),
  category: z.string(),
  modified_time: z.string(),
});
export type XRayFileItem = z.infer<typeof XRayFileItemSchema>;

export const XRayFolderNodeSchema = z.object({
  name: z.string(),
  path: z.string(),
  size_bytes: z.number(),
  file_count: z.number(),
  percentage: z.number(),
});
export type XRayFolderNode = z.infer<typeof XRayFolderNodeSchema>;

export const XRayReportSchema = z.object({
  root_path: z.string(),
  total_scanned_bytes: z.number(),
  total_files: z.number(),
  by_category: z.record(z.string(), z.number()),
  top_folders: z.array(XRayFolderNodeSchema),
  largest_files: z.array(XRayFileItemSchema),
});
export type XRayReport = z.infer<typeof XRayReportSchema>;

// 2. Orphaned App Leftovers
export const AppLeftoverSchema = z.object({
  id: z.string(),
  app_name: z.string(),
  paths: z.array(z.string()),
  total_bytes: z.number(),
  file_count: z.number(),
  source: z.string(),
  risk_level: z.string(),
  is_removable: z.boolean(),
});
export type AppLeftover = z.infer<typeof AppLeftoverSchema>;

// 3. Autostart & Boot Booster
export const AutostartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  enabled: z.boolean(),
  file_path: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  source: z.string(),
});
export type AutostartItem = z.infer<typeof AutostartItemSchema>;

// 4. Duplicate Finder (Twin Finder)
export const DuplicateItemSchema = z.object({
  path: z.string(),
  modified_time: z.string(),
  is_original: z.boolean(),
});
export type DuplicateItem = z.infer<typeof DuplicateItemSchema>;

export const DuplicateGroupSchema = z.object({
  group_id: z.string(),
  file_size: z.number(),
  count: z.number(),
  wasted_bytes: z.number(),
  files: z.array(DuplicateItemSchema),
  can_reflink: z.boolean(),
});
export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>;

// 5. System Vitals & Hardware Health
export const BatteryVitalsSchema = z.object({
  percentage: z.number(),
  status: z.string(),
  cycle_count: z.number().nullable().optional(),
  health_percentage: z.number().nullable().optional(),
  power_source: z.string(),
});
export type BatteryVitals = z.infer<typeof BatteryVitalsSchema>;

export const PowerProfileVitalsSchema = z.object({
  active_profile: z.string(),
  available_profiles: z.array(z.string()),
});
export type PowerProfileVitals = z.infer<typeof PowerProfileVitalsSchema>;

export const DiskHealthSummarySchema = z.object({
  filesystem: z.string(),
  total_gb: z.number(),
  used_gb: z.number(),
  free_gb: z.number(),
  is_btrfs: z.boolean(),
  trim_supported: z.boolean(),
});
export type DiskHealthSummary = z.infer<typeof DiskHealthSummarySchema>;

export const SnapshotCompactorInfoSchema = z.object({
  provider: z.string(),
  total_snapshots: z.number(),
  older_than_14d_count: z.number(),
  older_than_30d_count: z.number(),
  estimated_reclaimable_mb: z.number(),
});
export type SnapshotCompactorInfo = z.infer<typeof SnapshotCompactorInfoSchema>;

export const SystemVitalsReportSchema = z.object({
  battery: BatteryVitalsSchema.nullable().optional(),
  power_profile: PowerProfileVitalsSchema.nullable().optional(),
  disk_health: DiskHealthSummarySchema,
  snapshot_compactor: SnapshotCompactorInfoSchema,
});
export type SystemVitalsReport = z.infer<typeof SystemVitalsReportSchema>;


