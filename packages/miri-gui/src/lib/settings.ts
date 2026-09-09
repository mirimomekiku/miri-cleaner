/**
 * App-level preferences: notification toggles and the unused-app
 * uninstall-suggestion threshold. Persisted in localStorage, same
 * convention as theme.ts -- no backend involvement, purely a client-side
 * preference store.
 */

export interface NotificationSettings {
  /** Master switch; individual toggles below only matter when this is on. */
  enabled: boolean;
  lowDiskSpace: boolean;
  diskHealth: boolean;
  cleanupComplete: boolean;
  unusedApps: boolean;
}

export interface AppSettings {
  notifications: NotificationSettings;
  /** Suggest uninstalling an app once it hasn't been opened in this many days. */
  unusedAppThresholdDays: number;
  /** Below this fraction of free disk space, show a low-disk-space notification. */
  lowDiskSpaceThresholdPercent: number;
}

const SETTINGS_KEY = "miri-cleaner:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: true,
    lowDiskSpace: true,
    diskHealth: true,
    cleanupComplete: true,
    unusedApps: true,
  },
  unusedAppThresholdDays: 90,
  lowDiskSpaceThresholdPercent: 10,
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
    };
  } catch {
    // Storage can throw in locked-down webviews; fall back to defaults
    // rather than crash the app over a preferences read.
    return { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Nothing to persist to; the preference just won't survive a reload.
  }
}
