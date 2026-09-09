import React from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { TactileButton } from "../ui/TactileButton";
import { Sun, Moon, MonitorCog, Bell, Trash2, RotateCcw } from "lucide-react";
import { ThemeMode } from "../../lib/theme";
import { NotificationSettings } from "../../lib/settings";
import { HeroCard } from "../ui/HeroCard";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
  { mode: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
  { mode: "system", label: "Match System", icon: <MonitorCog className="w-4 h-4" /> },
];

const NOTIFICATION_TOGGLES: { key: keyof Omit<NotificationSettings, "enabled">; label: string; description: string }[] = [
  {
    key: "lowDiskSpace",
    label: "Low disk space",
    description: "Warn when free space drops below the threshold set below.",
  },
  {
    key: "diskHealth",
    label: "Drive health warnings",
    description: "Notify when a SMART attribute reports warning or critical status.",
  },
  {
    key: "cleanupComplete",
    label: "Cleanup complete",
    description: "Notify when a real (non-simulated) cleanup finishes.",
  },
  {
    key: "unusedApps",
    label: "Unused app suggestions",
    description: "Notify when apps cross the \"not opened in\" threshold below.",
  },
];

const UNUSED_APP_OPTIONS = [30, 60, 90, 180, 365];
const LOW_DISK_OPTIONS = [5, 10, 15, 20];

export const SettingsView: React.FC = () => {
  const { themeMode, setThemeMode, settings, updateSettings, openDangerModal } = useCleanerStore();

  const handleResetAppData = () => {
    openDangerModal({
      title: "Reset App Data?",
      description:
        "Clears local preferences stored on this device -- theme, notification settings, the onboarding flag, and battery health history -- and reloads the app. Nothing on your actual system is touched.",
      requiresElevation: false,
      riskLevel: "moderate",
      confirmWord: "RESET",
      onConfirm: () => {
        try {
          const allKeys = Object.keys(localStorage).filter((k) => k.startsWith("miri-cleaner:"));
          allKeys.forEach((k) => localStorage.removeItem(k));
        } catch {
          // Storage can throw in locked-down webviews; nothing to clean up then.
        }
        window.location.reload();
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto select-none">
      <HeroCard
        accent="miri"
        mascot={<Mascot mood="happy" size="lg" />}
        badgeLabel="Settings"
        badgeVariant="pink"
        heading="Preferences"
        description="Appearance, notifications, and how proactively Miri nudges you about unused apps and low disk space."
        descriptionMaxWidth="max-w-lg"
        spacing="space-y-4"
      />

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Appearance</h3>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setThemeMode(opt.mode)}
              aria-pressed={themeMode === opt.mode}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400 ${
                themeMode === opt.mode
                  ? "bg-miri-100 dark:bg-miri-400/20 border-miri-300 text-miri-700 dark:text-miri-300"
                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-500" />
            <span>Desktop Notifications</span>
          </h3>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <PixelCheckbox
              checked={settings.notifications.enabled}
              onChange={(checked) => updateSettings({ notifications: { ...settings.notifications, enabled: checked } })}
              label="Enable desktop notifications"
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {settings.notifications.enabled ? "On" : "Off"}
            </span>
          </label>
        </div>

        <div className={`space-y-2 ${settings.notifications.enabled ? "" : "opacity-40 pointer-events-none"}`}>
          {NOTIFICATION_TOGGLES.map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">{toggle.label}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{toggle.description}</p>
              </div>
              <PixelCheckbox
                checked={settings.notifications[toggle.key]}
                onChange={(checked) =>
                  updateSettings({ notifications: { ...settings.notifications, [toggle.key]: checked } })
                }
                label={`Toggle ${toggle.label} notifications`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Suggestion Thresholds</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-1.5">
            Suggest uninstalling apps unused for
            <select
              value={settings.unusedAppThresholdDays}
              onChange={(e) => updateSettings({ unusedAppThresholdDays: Number(e.target.value) })}
              className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-miri-400"
            >
              {UNUSED_APP_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-1.5">
            Warn when free disk space drops below
            <select
              value={settings.lowDiskSpaceThresholdPercent}
              onChange={(e) => updateSettings({ lowDiskSpaceThresholdPercent: Number(e.target.value) })}
              className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-miri-400"
            >
              {LOW_DISK_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Reset */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-3">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>Reset App Data</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Clears local preferences stored on this device -- theme, notification settings, the onboarding flag, and
          battery health history. Nothing on your actual system is touched.
        </p>
        <TactileButton variant="secondary" size="sm" onClick={handleResetAppData}>
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Defaults
        </TactileButton>
      </div>
    </div>
  );
};
