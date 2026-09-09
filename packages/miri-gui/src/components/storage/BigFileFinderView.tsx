import React, { useState } from "react";
import { Search, FileText, Info, MoreVertical } from "lucide-react";
import { bridge } from "../../lib/bridge";
import { BigFileQuery, BigFileReport } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { categoryStyle, CATEGORY_ORDER } from "../../lib/fileCategories";
import { ListSkeleton } from "../ui/Skeleton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { TactileButton } from "../ui/TactileButton";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { useFileActions } from "../../lib/useFileActions";
import { ContextMenu } from "../ui/ContextMenu";
import { FilePropertiesModal } from "./FilePropertiesModal";

const SIZE_PRESETS: { label: string; bytes: number }[] = [
  { label: "100 MB+", bytes: 100 * 1024 * 1024 },
  { label: "500 MB+", bytes: 500 * 1024 * 1024 },
  { label: "1 GB+", bytes: 1024 * 1024 * 1024 },
  { label: "5 GB+", bytes: 5 * 1024 * 1024 * 1024 },
];

const AGE_OPTIONS = [
  { label: "Any time", days: undefined },
  { label: "Older than 30 days", days: 30 },
  { label: "Older than 90 days", days: 90 },
  { label: "Older than 180 days", days: 180 },
  { label: "Older than a year", days: 365 },
];

const UNOPENED_OPTIONS = [
  { label: "Doesn't matter", days: undefined },
  { label: "Not opened in 30+ days", days: 30 },
  { label: "Not opened in 90+ days", days: 90 },
  { label: "Not opened in a year+", days: 365 },
];

export const BigFileFinderView: React.FC = () => {
  const [minSize, setMinSize] = useState(SIZE_PRESETS[1].bytes);
  const [categories, setCategories] = useState<string[]>([]);
  const [modifiedBeforeDays, setModifiedBeforeDays] = useState<number | undefined>(undefined);
  const [unopenedForDays, setUnopenedForDays] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<BigFileQuery["sort_by"]>("size");
  const [report, setReport] = useState<BigFileReport | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const errorAction = useAsyncAction();

  const runSearch = async () => {
    setHasSearched(true);
    await errorAction.run(async () => {
      const res = await bridge.findBigFiles({
        min_size_bytes: minSize,
        categories: categories.length > 0 ? categories : undefined,
        modified_before_days: modifiedBeforeDays,
        unopened_for_days: unopenedForDays,
        sort_by: sortBy,
        limit: 100,
      });
      setReport(res);
    });
  };

  const fileActions = useFileActions(runSearch);

  const toggleCategory = (key: string) => {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  return (
    <div className="space-y-4">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} retryLabel="Retry" />
      )}
      {fileActions.error && (
        <ErrorBanner message={fileActions.error} onDismiss={fileActions.dismissError} />
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-rose-500" />
          <span>Find Big Files</span>
        </h3>

        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Minimum size</div>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setMinSize(preset.bytes)}
                className={`chip-press px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  minSize === preset.bytes
                    ? "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                    : "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">File type</div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((key) => {
              const style = categoryStyle(key);
              const selected = categories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className={`chip-press px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    selected ? style.bg : "bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-1">
            Last modified
            <select
              value={modifiedBeforeDays ?? ""}
              onChange={(e) => setModifiedBeforeDays(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-400"
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-1">
            Last opened
            <select
              value={unopenedForDays ?? ""}
              onChange={(e) => setUnopenedForDays(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-400"
            >
              {UNOPENED_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex flex-col gap-1">
            Sort by
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BigFileQuery["sort_by"])}
              className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-400"
            >
              <option value="size">Largest first</option>
              <option value="oldest_modified">Oldest modified first</option>
              <option value="oldest_accessed">Longest unopened first</option>
            </select>
          </label>
        </div>

        <div className="flex justify-center pt-1">
          <TactileButton variant="primary" size="md" pill onClick={runSearch} disabled={errorAction.isPending}>
            <Search className="w-4 h-4" />
            {errorAction.isPending ? "Searching..." : "Find Big Files"}
          </TactileButton>
        </div>
      </div>

      {report?.access_time_note && (
        <div className="flex items-start gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{report.access_time_note}</span>
        </div>
      )}

      {errorAction.isPending ? (
        <ListSkeleton count={4} />
      ) : !hasSearched || !report ? null : report.files.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo text-center space-y-2">
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">No files matched these filters</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try a lower minimum size or a broader file type selection.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              {report.total_matched} match{report.total_matched === 1 ? "" : "es"} · {formatBytes(report.total_matched_bytes).formatted}
            </h4>
            {report.files.length < report.total_matched && (
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Showing top {report.files.length}</span>
            )}
          </div>
          <div className="space-y-2">
            {report.files.map((file) => {
              const style = categoryStyle(file.category);
              return (
                <div
                  key={file.path}
                  onContextMenu={(e) => fileActions.openContextMenu(e, file.path, file.name, false)}
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${style.bg}`}>{style.label}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {file.path} · Modified {file.modified_time}
                        {file.accessed_time && ` · Opened ${file.accessed_time}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-pixel text-xs text-slate-900 dark:text-slate-100 font-bold">
                      {formatBytes(file.size_bytes).formatted}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => fileActions.openContextMenuAt(e.currentTarget, file.path, file.name, false)}
                      aria-label={`Actions for ${file.name}`}
                      aria-haspopup="menu"
                      className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fileActions.contextMenu && (
        <ContextMenu
          x={fileActions.contextMenu.x}
          y={fileActions.contextMenu.y}
          onClose={fileActions.closeContextMenu}
          items={fileActions.buildMenuItems()!}
        />
      )}

      {fileActions.propertiesPath && (
        <FilePropertiesModal path={fileActions.propertiesPath} onClose={() => fileActions.setPropertiesPath(null)} />
      )}
    </div>
  );
};
