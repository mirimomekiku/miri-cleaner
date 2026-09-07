import React from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { Terminal, Sparkles, Cpu, Layers } from "lucide-react";
import { PixelBadge } from "../ui/PixelBadge";

export const Header: React.FC = () => {
  const { viewMode, setViewMode, setActiveTab, scanResult, toggleLogDrawer, logDrawerOpen } =
    useCleanerStore();

  const osName = scanResult?.system_info.os_name || "Fedora Linux 43";
  const isElevated = scanResult?.system_info.is_elevated || false;

  return (
    <header className="bg-white border-b-2 border-slate-100 px-3 sm:px-6 py-3.5 flex items-center justify-between gap-2 shadow-sm select-none">
      {/* Brand & Mascot */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Mascot mood="happy" size="sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
              Miri Cleaner
            </h1>
            <span className="hidden sm:inline">
              <PixelBadge label="v0.1.0" variant="pink" />
            </span>
          </div>
          <p className="hidden sm:block text-xs font-semibold text-slate-400 truncate">
            Zero-Trust Safe & Playful System Optimizer
          </p>
        </div>
      </div>

      {/* Center Status Badge */}
      <div className="hidden md:flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-miri-400" />
          <span>{osName}</span>
        </div>
      </div>

      {/* Right Controls: Mode Toggle & Log Terminal */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Casual / Advanced Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode("casual")}
            title="Casual"
            aria-label="Casual mode"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "casual"
                ? "bg-white text-miri-600 shadow-duo-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
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
                ? "bg-white text-miri-600 shadow-duo-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Advanced</span>
          </button>
        </div>

        {/* Terminal Logs Drawer Toggle */}
        <button
          onClick={toggleLogDrawer}
          title="Toggle Terminal Activity Logs"
          className={`p-2 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${
            logDrawerOpen
              ? "bg-slate-900 border-slate-900 text-miri-300 shadow-duo-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
