import React from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { Terminal, Sparkles, Cpu, Layers, Sun, Moon, MonitorCog } from "lucide-react";
import { PixelBadge } from "../ui/PixelBadge";
import { ThemeMode } from "../../lib/theme";

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICON: Record<ThemeMode, React.ReactNode> = {
  light: <Sun className="w-4 h-4" />,
  dark: <Moon className="w-4 h-4" />,
  system: <MonitorCog className="w-4 h-4" />,
};
const THEME_LABEL: Record<ThemeMode, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "Match system theme",
};

export const Header: React.FC = () => {
  const { viewMode, setViewMode, themeMode, setThemeMode, setActiveTab, scanResult, toggleLogDrawer, logDrawerOpen } =
    useCleanerStore();

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length];
    setThemeMode(next);
  };

  const osName = scanResult?.system_info.os_name || "Fedora Linux 43";
  const isElevated = scanResult?.system_info.is_elevated || false;

  return (
    <header className="bg-white dark:bg-slate-800 border-b-2 border-slate-100 dark:border-slate-700/60 px-3 sm:px-6 py-3.5 flex items-center justify-between gap-2 shadow-sm select-none">
      {/* Brand & Mascot */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Mascot mood="happy" size="sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
              Miri Cleaner
            </h1>
            <span className="hidden sm:inline">
              <PixelBadge label={`v${__APP_VERSION__}`} variant="pink" />
            </span>
          </div>
          <p className="hidden sm:block text-xs font-semibold text-slate-400 dark:text-slate-500 truncate">
            Safe & Playful System Cleanup
          </p>
        </div>
      </div>

      {/* Center Status Badge */}
      <div className="hidden md:flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-miri-400" />
          <span>{osName}</span>
        </div>
      </div>

      {/* Right Controls: Mode Toggle & Log Terminal */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Casual / Advanced Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode("casual")}
            title="Casual"
            aria-label="Casual mode"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "casual"
                ? "bg-white dark:bg-slate-800 text-miri-600 shadow-duo-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Casual</span>
          </button>
          <button
            onClick={() => setViewMode("power")}
            title="Advanced"
            aria-label="Advanced mode"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "power"
                ? "bg-white dark:bg-slate-800 text-miri-600 shadow-duo-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Advanced</span>
          </button>
        </div>

        {/* Theme Toggle: cycles Light -> Dark -> System */}
        <button
          onClick={cycleTheme}
          title={THEME_LABEL[themeMode]}
          aria-label={THEME_LABEL[themeMode]}
          className="p-2 rounded-xl border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center shrink-0"
        >
          {THEME_ICON[themeMode]}
        </button>

        {/* Activity Log Drawer Toggle */}
        <button
          onClick={toggleLogDrawer}
          title="Toggle Activity Log"
          className={`p-2 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${
            logDrawerOpen
              ? "bg-slate-900 border-slate-900 text-miri-300 shadow-duo-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
