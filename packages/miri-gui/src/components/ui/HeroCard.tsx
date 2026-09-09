import React from "react";
import { PixelBadge } from "./PixelBadge";

type PixelBadgeVariant = React.ComponentProps<typeof PixelBadge>["variant"];

/** Full, static class strings per accent -- never interpolated, since a
 * template string like `to-${accent}-50/60` is invisible to Tailwind's JIT
 * scanner and silently generates no CSS. Add a color here (matching an
 * existing hero card's actual `to-*-50/60 border-*-100` pair) before using
 * it as an `accent`, rather than passing an arbitrary string through. */
const ACCENT_CLASSES: Record<string, string> = {
  miri: "to-miri-50/60 border-miri-100",
  amber: "to-amber-50/50 border-amber-100",
  sky: "to-sky-50/60 border-sky-100",
};

interface HeroCardProps {
  /** One of ACCENT_CLASSES' keys. */
  accent: keyof typeof ACCENT_CLASSES;
  /** The already-sized, already-moody `<Mascot />` (plus any overlay like
   * `<ConfettiBurst />`) -- HeroCard only positions it, since the mood
   * logic and celebration overlays vary too much per view to flatten into
   * a prop. */
  mascot: React.ReactNode;
  badgeLabel: string;
  badgeVariant: PixelBadgeVariant;
  /** Small text shown beside the badge (e.g. "Btrfs Snapper - Windows VSS"). */
  badgeSubtitle?: React.ReactNode;
  heading: React.ReactNode;
  description: React.ReactNode;
  descriptionMaxWidth?: string;
  /** "space-y-6" (default, most hero cards) or "space-y-4" (denser ones
   * with no stat strip, like Settings). */
  spacing?: "space-y-4" | "space-y-6";
  /** Stat strip, sub-tabs, primary action -- rendered after the
   * description, varying too much per view to be anything but children. */
  children?: React.ReactNode;
}

/** The app's recurring dashboard hero: a gradient rounded-[2rem] card
 * anchored by the mascot, a badge row, a heading, and a description, with
 * per-view content (stat strips, sub-tabs, the primary action) appended
 * as children. Shared by Storage & Duplicates, Safety & Vitals, Settings,
 * Packages & Toolchains, and OS Tweaks.
 *
 * Deliberately NOT used by Quick Clean (its hero branches into two
 * genuinely different layouts -- an in-progress/idle state and a
 * completion-receipt state with its own badge/heading/stat shapes, not
 * just different text in the same slots) or Get Apps (its hero isn't
 * center-aligned, a real layout difference, not a copy-paste gap). Forcing
 * either through this shape would fight what they actually need. */
export const HeroCard: React.FC<HeroCardProps> = ({
  accent,
  mascot,
  badgeLabel,
  badgeVariant,
  badgeSubtitle,
  heading,
  description,
  descriptionMaxWidth = "max-w-md",
  spacing = "space-y-6",
  children,
}) => (
  <div
    className={`bg-gradient-to-b from-white dark:from-slate-800 ${ACCENT_CLASSES[accent]} rounded-[2rem] p-10 sm:p-12 border-2 dark:border-slate-700/60 shadow-duo text-center ${spacing}`}
  >
    <div className="flex justify-center relative">{mascot}</div>

    <div className="flex items-center justify-center gap-2 flex-wrap">
      <PixelBadge label={badgeLabel} variant={badgeVariant} />
      {badgeSubtitle && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{badgeSubtitle}</span>
      )}
    </div>

    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{heading}</h2>
    <p className={`text-sm font-semibold text-slate-500 dark:text-slate-400 ${descriptionMaxWidth} mx-auto leading-relaxed`}>
      {description}
    </p>

    {children}
  </div>
);
