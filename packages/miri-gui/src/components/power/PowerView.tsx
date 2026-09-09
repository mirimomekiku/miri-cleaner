import React, { useState, useEffect } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { RiskPill } from "../ui/RiskPill";
import { Shield } from "lucide-react";
import { bridge } from "../../lib/bridge";
import { SnapshotStatus } from "../../types";
import { ListSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { ErrorBanner } from "../ui/ErrorBanner";

export const PowerView: React.FC = () => {
  const { scanResult, selectedTargetIds, toggleTarget, selectAll, deselectAll } =
    useCleanerStore();

  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const errorAction = useAsyncAction();

  useEffect(() => {
    errorAction.run(
      async () => {
        const status = await bridge.getSnapshotStatus();
        setSnapshotStatus(status);
      },
      {
        formatError: (e) =>
          `Loading snapshot status failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} />
      )}

      {/* Advanced Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PixelBadge label="Advanced" variant="blue" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Granular OS Control</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Detailed Target Inspection</h2>
        </div>

        {/* Snapshot Readiness Pill */}
        {snapshotStatus && (
          <div className="hidden sm:flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200 text-emerald-900 text-xs">
            <Shield className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="font-bold">{snapshotStatus.provider_name}</div>
              <div className="text-[11px] text-emerald-700">Pre-flight checkpoints ready</div>
            </div>
          </div>
        )}
      </div>

      {/* Granular Target Inspection List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Select items for dry-run simulation or execution:
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {!scanResult ? (
            <ListSkeleton count={6} />
          ) : (
            scanResult.targets.map((target) => {
              const isSelected = selectedTargetIds.includes(target.id);
              const sizeFormatted = formatBytes(target.estimated_bytes).formatted;

              return (
                <div
                  key={target.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                    isSelected ? "border-miri-400 shadow-duo-sm" : "border-slate-100 dark:border-slate-700/60 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PixelCheckbox
                      checked={isSelected}
                      onChange={() => toggleTarget(target.id)}
                      label={`Select ${target.name}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm">{target.name}</h4>
                        <RiskPill level={target.risk_level} />
                        {target.requires_elevation && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                            Requires Root/UAC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{target.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-8 sm:pl-0">
                    <div className="font-pixel text-xs text-slate-800 dark:text-slate-200 font-bold">{sizeFormatted}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{target.file_count} files</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
