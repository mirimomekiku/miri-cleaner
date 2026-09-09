import React from "react";

interface StatTileProps {
  /** The headline value -- a formatted number/string, or a small JSX
   * fragment (e.g. "3/12") when the stat itself needs inline structure. */
  value: React.ReactNode;
  label: string;
  /** A small unit rendered right after `value` (e.g. "GB", "MB") in the
   * app's standard split value/unit style. Omit when `value` already
   * carries everything it needs to show. */
  suffix?: React.ReactNode;
  /** Full replacement for the value's color (and any extra classes like
   * `truncate`/`max-w-*`/`font-pixel`) -- never appended alongside the
   * default, so there's never a cascade-order fight between two colors.
   * Defaults to the app's neutral slate. */
  valueClassName?: string;
}

/** The app's recurring hero-card stat: a big tabular-nums number with a
 * small uppercase label underneath. Shared by every view whose hero card
 * shows 2-3 of these side by side (Quick Clean, Storage & Duplicates,
 * Packages & Toolchains, OS Tweaks) instead of each re-implementing the
 * same two-line markup. Views whose "stat" is really something else --
 * an icon-only badge, a differently-sized truncated string -- stay on
 * their own markup rather than being forced through this. */
export const StatTile: React.FC<StatTileProps> = ({ value, label, suffix, valueClassName }) => (
  <div className="text-center">
    <div className={`text-2xl font-black tabular-nums ${valueClassName ?? "text-slate-800 dark:text-slate-200"}`}>
      {value}
      {suffix != null && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-0.5">{suffix}</span>
      )}
    </div>
    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</div>
  </div>
);
