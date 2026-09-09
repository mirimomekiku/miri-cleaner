/** Shared styling/labels for the file category keys `SpaceXRay::categorize_file`
 * (Rust) assigns -- used by the Storage Breakdown list and the Big File
 * Finder so both agree on what each category looks like. */
export interface CategoryStyle {
  bg: string;
  bar: string;
  label: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  build_cache: { bg: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", bar: "bg-emerald-500", label: "Build Caches" },
  video: { bg: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800", bar: "bg-indigo-500", label: "Videos" },
  archives_installers: { bg: "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800", bar: "bg-amber-500", label: "Archives & Installers" },
  images: { bg: "bg-pink-50 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800", bar: "bg-pink-500", label: "Photos & Images" },
  audio: { bg: "bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800", bar: "bg-purple-500", label: "Audio" },
  documents: { bg: "bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800", bar: "bg-sky-500", label: "Documents" },
  other: { bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700", bar: "bg-slate-400", label: "Other Files" },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_STYLES);

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
}
