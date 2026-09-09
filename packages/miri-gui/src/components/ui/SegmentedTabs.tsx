import React from "react";

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabOption<T>[];
}

/** The app's recurring segmented pill sub-tab toggle: a slate track with a
 * white/slate-800 active pill, icon + label per tab. Shared by every view
 * with more than one sub-mode (Storage & Duplicates' four tabs, Packages &
 * Toolchains' category toggles) instead of each re-implementing the same
 * button-list markup with only the tab set and active check varying. */
export function SegmentedTabs<T extends string>({ value, onChange, options }: SegmentedTabsProps<T>) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 p-1 bg-slate-100/80 dark:bg-slate-700/80 rounded-xl w-full sm:w-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400 ${
              value === opt.value
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-duo-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
