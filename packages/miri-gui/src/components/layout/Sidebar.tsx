import React, { useEffect, useState } from "react";
import { useCleanerStore, TabId } from "../../store/useCleanerStore";
import { bridge } from "../../lib/bridge";
import {
  Sparkles,
  HardDrive,
  Download,
  Boxes,
  Wrench,
  History,
  Settings as SettingsIcon,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, viewMode, settings } = useCleanerStore();
  const [unusedAppCount, setUnusedAppCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    bridge
      .getInstalledAppUsage()
      .then((usage) => {
        if (cancelled) return;
        setUnusedAppCount(usage.filter((a) => a.last_used_days_ago >= settings.unusedAppThresholdDays).length);
      })
      .catch(() => {
        // The badge is a bonus nudge, not core functionality; a failed
        // fetch just leaves it hidden for this session.
      });
    return () => {
      cancelled = true;
    };
  }, [settings.unusedAppThresholdDays]);

  const navItems: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "dashboard",
      label: viewMode === "casual" ? "Quick Clean" : "Dashboard",
      icon: <Sparkles className="w-5 h-5 text-miri-500" />,
    },
    {
      id: "storage",
      label: "Storage & Duplicates",
      icon: <HardDrive className="w-5 h-5 text-amber-500" />,
    },
    {
      id: "apps",
      label: "Get Apps",
      icon: <Download className="w-5 h-5 text-pink-500" />,
      badge: unusedAppCount,
    },
    {
      id: "packages",
      label: "Packages & Toolchains",
      icon: <Boxes className="w-5 h-5 text-indigo-500" />,
    },
    {
      id: "tweaks",
      label: "OS Tweaks",
      icon: <Wrench className="w-5 h-5 text-rose-500" />,
    },
    {
      id: "snapshots",
      label: "Safety & Vitals",
      icon: <History className="w-5 h-5 text-sky-500" />,
    },
  ];

  return (
    <aside className="w-16 sm:w-20 lg:w-64 shrink-0 bg-white dark:bg-slate-800 border-r-2 border-slate-100 dark:border-slate-700/60 p-2 sm:p-3 lg:p-4 flex flex-col justify-between select-none transition-all">
      {/* Navigation List */}
      <div className="space-y-1.5">
        <div className="px-2 lg:px-3 py-2 text-[10px] lg:text-[11px] font-pixel text-slate-400 dark:text-slate-500 tracking-wider uppercase text-center lg:text-left">
          <span className="hidden lg:inline">Navigation</span>
          <span className="lg:hidden">Nav</span>
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const accessibleLabel = item.badge
            ? `${item.label}, ${item.badge} suggestion${item.badge === 1 ? "" : "s"} to review`
            : item.label;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={accessibleLabel}
              aria-label={accessibleLabel}
              className={`w-full flex items-center justify-center lg:justify-between px-3 lg:px-4 py-3 rounded-2xl font-extrabold text-sm transition-all text-left ${
                isActive
                  ? "bg-miri-100/80 text-miri-700 border-2 border-miri-300 shadow-duo-sm lg:translate-x-1"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 relative">
                  {item.icon}
                  {!!item.badge && (
                    <span className="lg:hidden absolute -top-2 -right-2 min-w-[1rem] h-4 px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden lg:inline truncate">{item.label}</span>
              </div>
              {!!item.badge && (
                <span className="hidden lg:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <button
          onClick={() => setActiveTab("settings")}
          title="Settings"
          aria-label="Settings"
          className={`w-full flex items-center justify-center lg:justify-between px-3 lg:px-4 py-3 rounded-2xl font-extrabold text-sm transition-all text-left ${
            activeTab === "settings"
              ? "bg-miri-100/80 text-miri-700 border-2 border-miri-300 shadow-duo-sm lg:translate-x-1"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border-2 border-transparent"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              <SettingsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <span className="hidden lg:inline truncate">Settings</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
