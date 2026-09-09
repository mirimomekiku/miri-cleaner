import React, { useEffect, useState } from "react";
import { Globe, ShieldAlert, Trash2, CheckCircle2 } from "lucide-react";
import { bridge } from "../../lib/bridge";
import { BrowserCleanupReport, BrowserDataCategory, BrowserProfile } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { ListSkeleton } from "../ui/Skeleton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { TactileButton } from "../ui/TactileButton";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { useCleanerStore } from "../../store/useCleanerStore";

/** Uniquely keys one category within one browser profile, since the same
 * category key (e.g. "cache") repeats across browsers/profiles. */
const categoryKey = (browser: BrowserProfile, cat: BrowserDataCategory) =>
  `${browser.browser_id}::${browser.profile_name}::${cat.key}`;

export const BrowserCleanupView: React.FC = () => {
  const { addLog, openDangerModal } = useCleanerStore();
  const [report, setReport] = useState<BrowserCleanupReport | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const errorAction = useAsyncAction();

  const loadData = async () => {
    setSelected(new Set());
    await errorAction.run(async () => {
      addLog("Scanning installed browser profiles...");
      const res = await bridge.scanBrowserData();
      setReport(res);
      addLog(`Browser data scan complete: ${formatBytes(res.total_bytes).formatted} across ${res.browsers.length} profile(s).`);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedPaths: string[] = [];
  let selectedBytes = 0;
  if (report) {
    for (const browser of report.browsers) {
      for (const cat of browser.categories) {
        if (selected.has(categoryKey(browser, cat))) {
          selectedPaths.push(...cat.paths);
          selectedBytes += cat.size_bytes;
        }
      }
    }
  }

  const handleClearSelected = () => {
    if (selectedPaths.length === 0) return;
    const includesUnsafe = report?.browsers.some((b) =>
      b.categories.some((c) => selected.has(categoryKey(b, c)) && !c.safe_to_clear)
    );

    openDangerModal({
      title: "Clear Selected Browser Data",
      description: `This moves the selected data (${formatBytes(selectedBytes).formatted}) to the recycle bin.${
        includesUnsafe ? " This includes cookies -- you'll be signed out of sites that use them." : ""
      } Close your browser first for the best results.`,
      requiresElevation: false,
      riskLevel: includesUnsafe ? "moderate" : "safe",
      confirmWord: "CLEAR",
      onConfirm: async () => {
        await errorAction.run(async () => {
          const res = await bridge.clearBrowserData(selectedPaths);
          addLog(res.details);
          await loadData();
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} retryLabel="Retry" />
      )}

      {errorAction.isPending && !report ? (
        <ListSkeleton count={3} />
      ) : !report || report.browsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="text-lg font-black text-slate-800 dark:text-slate-200">No browser data found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No installed Chrome, Edge, Brave, Chromium, or Firefox profiles with meaningful stored data were detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {report.browsers.map((browser) => (
            <div key={`${browser.browser_id}-${browser.profile_name}`} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {browser.browser_name} <span className="text-slate-400 dark:text-slate-500 font-bold">· {browser.profile_name}</span>
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{formatBytes(browser.total_bytes).formatted}</span>
              </div>

              <div className="space-y-2">
                {browser.categories.map((cat) => {
                  const key = categoryKey(browser, cat);
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PixelCheckbox checked={selected.has(key)} onChange={() => toggle(key)} label={`Select ${cat.label}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{cat.label}</span>
                            {!cat.safe_to_clear && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" /> Signs you out
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">{formatBytes(cat.size_bytes).formatted}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-col items-center gap-2 pt-2 pb-4">
            <TactileButton
              variant="danger"
              size="hero"
              pill
              onClick={handleClearSelected}
              disabled={selectedPaths.length === 0 || errorAction.isPending}
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              {selectedPaths.length === 0
                ? "Select data to clear"
                : `Clear Selected (${formatBytes(selectedBytes).formatted})`}
            </TactileButton>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Moved to the recycle bin, never permanently deleted.</p>
          </div>
        </div>
      )}
    </div>
  );
};
