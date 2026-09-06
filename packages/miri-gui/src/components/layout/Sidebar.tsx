import React from "react";
import { useCleanerStore, TabId } from "../../store/useCleanerStore";
import {
  Sparkles,
  HardDrive,
  Download,
  Boxes,
  Wrench,
  History,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, viewMode, setViewMode } = useCleanerStore();

  const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
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
    <aside className="w-16 sm:w-20 lg:w-64 shrink-0 bg-white border-r-2 border-slate-100 p-2 sm:p-3 lg:p-4 flex flex-col justify-between select-none transition-all">
      {/* Navigation List */}
      <div className="space-y-1.5">
        <div className="px-2 lg:px-3 py-2 text-[10px] lg:text-[11px] font-pixel text-slate-400 tracking-wider uppercase text-center lg:text-left">
          <span className="hidden lg:inline">Navigation</span>
          <span className="lg:hidden">Nav</span>
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`w-full flex items-center justify-center lg:justify-between px-3 lg:px-4 py-3 rounded-2xl font-extrabold text-sm transition-all text-left ${
                isActive
                  ? "bg-miri-100/80 text-miri-700 border-2 border-miri-300 shadow-duo-sm lg:translate-x-1"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{item.icon}</div>
                <span className="hidden lg:inline truncate">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
