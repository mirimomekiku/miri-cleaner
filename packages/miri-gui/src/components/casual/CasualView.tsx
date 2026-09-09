import React, { useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { ConfettiBurst } from "../ui/ConfettiBurst";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import {
  Sparkles,
  Trash2,
  Globe,
  Package,
  Cpu,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  FileText,
  RefreshCw,
  Search,
  Wand2,
  Lock,
} from "lucide-react";
import { CardSkeleton } from "../ui/Skeleton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { SmartCleanWizard } from "./SmartCleanWizard";
import { bridge } from "../../lib/bridge";
import { CleanExecutionResult, CleanTarget } from "../../types";
import { formatBytes, formatNumber, calculateHealthScore } from "../../lib/formatters";
import { useCountUp } from "../../lib/useCountUp";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { notify } from "../../lib/notify";
import { StatTile } from "../ui/StatTile";

/** Scales the completion celebration to the actual amount freed, so a quick
 * temp-file sweep and a multi-gigabyte prune don't get identical fanfare. */
export function celebrationTier(freedBytes: number): "modest" | "solid" | "major" {
  const gb = freedBytes / (1024 * 1024 * 1024);
  if (gb >= 5) return "major";
  if (gb >= 0.5) return "solid";
  return "modest";
}

export const CasualView: React.FC = () => {
  const {
    scanResult,
    setScanResult,
    selectedTargetIds,
    toggleTarget,
    selectAll,
    deselectAll,
    isScanning,
    setIsScanning,
    isCleaning,
    setIsCleaning,
    addLog,
    openDangerModal,
    setLastCleanResult,
    setActiveTab,
  } = useCleanerStore();

  const [dryRun, setDryRun] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState(false);
  const [completionReceipt, setCompletionReceipt] = useState<CleanExecutionResult | null>(null);
  const errorAction = useAsyncAction();
  // Purely cosmetic: which retry label/mascot-alert copy to show. The error
  // message and retry callback itself come from errorAction -- this only
  // disambiguates "Retry Scan" vs "Retry Pruning" text.
  const [lastFailedAction, setLastFailedAction] = useState<"scan" | "clean" | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  // Host OS detection
  const currentOs =
    scanResult?.system_info.os ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
      ? "windows"
      : "linux");
  const hostLabel = currentOs === "linux" ? "Fedora Linux" : "Windows 11";

  // Total detected clutter across the whole system (objective baseline)
  const totalDetectedBytes = scanResult ? scanResult.total_reclaimable_bytes : 0;
  const healthScore = calculateHealthScore(totalDetectedBytes);
  const animatedHealthScore = Math.round(useCountUp(healthScore));

  // Selected bytes for action with resilient formatter
  const selectedBytes = scanResult
    ? scanResult.targets
        .filter((t) => selectedTargetIds.includes(t.id))
        .reduce((acc, t) => acc + t.estimated_bytes, 0)
    : 0;
  const animatedSelectedBytes = useCountUp(selectedBytes);

  const selectedFormatted = formatBytes(animatedSelectedBytes);

  // Hooks must run unconditionally even though the receipt itself is
  // conditionally rendered; fall back to 0 when there is no receipt yet.
  const animatedDeletedFiles = Math.round(
    useCountUp(completionReceipt?.deleted_files ?? 0)
  );
  const animatedSkippedFiles = Math.round(
    useCountUp(completionReceipt?.skipped_files ?? 0)
  );

  const handleScan = async () => {
    if (isScanning || isCleaning) return;
    setIsScanning(true);
    setLastFailedAction(null);
    // A prior clean's celebration shouldn't linger over an unrelated new
    // inspection; the hero mascot should read the mood of what's happening now.
    setSuccessCelebration(false);
    setCompletionReceipt(null);
    setStatusAnnouncement("Scanning system paths for clutter...");
    addLog("Initiating non-destructive system path inspection...");

    await errorAction.run(
      async () => {
        const res = await bridge.scanAll();
        setScanResult(res);
        const formattedTotal = formatBytes(res.total_reclaimable_bytes);
        const msg = `Scan complete! Discovered ${formattedTotal.formatted} across ${res.targets.length} targets.`;
        setStatusAnnouncement(msg);
        addLog(msg);
      },
      {
        formatError: (e) => {
          const msg = `Scan inspection failed: ${e instanceof Error ? e.message : String(e)}`;
          setLastFailedAction("scan");
          setStatusAnnouncement(`Scan failed: ${msg}`);
          addLog(msg);
          return msg;
        },
      }
    );
    setIsScanning(false);
  };

  const handleSelectSafeOnly = () => {
    if (!scanResult) return;
    const safeIds = scanResult.targets
      .filter((t) => t.risk_level === "safe" && !t.requires_elevation)
      .map((t) => t.id);
    useCleanerStore.setState({ selectedTargetIds: safeIds });
    setStatusAnnouncement(`Selected ${safeIds.length} safe targets.`);
  };

  const handleCleanTrigger = () => {
    if (selectedTargetIds.length === 0 || isCleaning || isScanning) return;
    errorAction.dismiss();

    const selectedTargets =
      scanResult?.targets.filter((t) => selectedTargetIds.includes(t.id)) || [];
    const hasDangerous = selectedTargets.some(
      (t) => t.risk_level === "dangerous" || t.risk_level === "aggressive"
    );
    const hasElevation = selectedTargets.some((t) => t.requires_elevation);

    if (hasDangerous || hasElevation) {
      openDangerModal({
        title: "Confirm Protected System Maintenance",
        description: `You are about to prune ${selectedTargets.length} categories (${selectedFormatted.formatted}). A pre-execution safety checkpoint will be verified.`,
        targets: selectedTargets,
        requiresElevation: hasElevation,
        riskLevel: hasDangerous ? "dangerous" : "moderate",
        onConfirm: () => executeCleanAction(),
      });
    } else {
      executeCleanAction();
    }
  };

  const executeCleanAction = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    setLastFailedAction(null);
    setStatusAnnouncement(
      dryRun
        ? "Simulating system prune without file removal..."
        : "Creating safety snapshot and pruning selected targets..."
    );
    addLog(`Executing cleanup plan: dry_run=${dryRun}, targets=${selectedTargetIds.length}`);

    await errorAction.run(
      async () => {
        const result = await bridge.executeClean({
          target_ids: selectedTargetIds,
          dry_run: dryRun,
          create_snapshot: true,
        });
        setLastCleanResult(result);
        setCompletionReceipt(result);
        setSuccessCelebration(true);
        const freedFormatted = formatBytes(result.freed_bytes);
        const finishMsg = `Success! Freed ${freedFormatted.formatted} (${formatNumber(
          result.deleted_files
        )} files pruned, ${formatNumber(result.skipped_files)} preserved).`;
        setStatusAnnouncement(finishMsg);
        addLog(finishMsg);

        if (!dryRun && result.freed_bytes > 0) {
          notify("cleanupComplete", "Cleanup complete", finishMsg);
        }

        // Refresh scan data quietly to update baseline
        try {
          const res = await bridge.scanAll();
          setScanResult(res);
        } catch {
          // Silent catch for background refresh
        }
      },
      {
        formatError: (e) => {
          const msg = `Clean execution halted: ${e instanceof Error ? e.message : String(e)}`;
          setLastFailedAction("clean");
          setStatusAnnouncement(`Error during cleanup: ${msg}`);
          addLog(msg);
          return msg;
        },
      }
    );
    setIsCleaning(false);
  };

  // Semantic category icon and theme resolver
  const getTargetTheme = (target: CleanTarget) => {
    const id = target.id.toLowerCase();
    const cat = target.category.toLowerCase();

    if (id.includes("browser") || cat.includes("browser") || id.includes("chrome") || id.includes("firefox")) {
      return {
        icon: <Globe className="w-6 h-6 text-sky-600" />,
        bg: "bg-sky-50 border-sky-200 text-sky-800",
        pill: "Browser Cache",
      };
    }
    if (id.includes("dnf") || id.includes("flatpak") || cat.includes("package") || id.includes("winget")) {
      return {
        icon: <Package className="w-6 h-6 text-indigo-600" />,
        bg: "bg-indigo-50 border-indigo-200 text-indigo-800",
        pill: "Package Store",
      };
    }
    if (id.includes("docker") || id.includes("cargo") || id.includes("npm") || cat.includes("dev") || id.includes("python")) {
      return {
        icon: <Cpu className="w-6 h-6 text-emerald-600" />,
        bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
        pill: "Dev Toolchain",
      };
    }
    if (id.includes("journal") || id.includes("log") || id.includes("dump")) {
      return {
        icon: <FileText className="w-6 h-6 text-amber-600" />,
        bg: "bg-amber-50 border-amber-200 text-amber-800",
        pill: "System Logs",
      };
    }
    return {
      icon: <Trash2 className="w-6 h-6 text-rose-500" />,
      bg: "bg-rose-50 border-rose-200 text-rose-800",
      pill: "Temporary Junk",
    };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {/* Screen reader live status announcement region */}
      <div aria-live="polite" className="sr-only" role="status">
        {statusAnnouncement}
      </div>

      {/* ========================================================================= */}
      {/* 1. ERROR ALERT BANNER (RESILIENT RECOVERY)                                */}
      {/* ========================================================================= */}
      {errorAction.error && (
        <ErrorBanner
          message={errorAction.error}
          onDismiss={errorAction.dismiss}
          onRetry={errorAction.retry}
          retryLabel={lastFailedAction === "clean" ? "Retry Pruning" : "Retry Scan"}
        />
      )}

      {/* ========================================================================= */}
      {/* ONE HERO MODULE -- lesson-screen grammar: a single dominant focal card,   */}
      {/* the mascot as emotional anchor, one big pill primary action. The         */}
      {/* completion receipt IS the hero when present; otherwise the hero reads    */}
      {/* the current status (idle / scanning / cleaning / error) and offers the   */}
      {/* one obvious next step. Health/streak collapse into a slim stat strip     */}
      {/* instead of stacking as separate parallel cards.                         */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-white dark:from-slate-800 to-miri-50/60 rounded-[2rem] p-10 sm:p-12 border-2 border-miri-100 shadow-duo text-center space-y-6">
        <div className="relative flex justify-center">
          <Mascot
            mood={
              completionReceipt
                ? "celebrate"
                : errorAction.error
                ? "alert"
                : isScanning
                ? "scanning"
                : isCleaning
                ? "cleaning"
                : "happy"
            }
            size="lg"
          />
          {completionReceipt && !dryRun && (
            <ConfettiBurst tier={celebrationTier(completionReceipt.freed_bytes)} />
          )}
        </div>

        {completionReceipt ? (
          <>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 font-pixel">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All Trimmed & Fresh
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {dryRun ? "Simulation Complete!" : "Hooray! Freshly Polished!"}
            </h2>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {dryRun
                ? `Simulated clean finished. In live mode, this would safely reclaim ${
                    formatBytes(completionReceipt.freed_bytes).formatted
                  }.`
                : `Successfully cleared ${
                    formatBytes(completionReceipt.freed_bytes).formatted
                  }. A verified snapshot was registered before pruning.`}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 tabular-nums">
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {formatNumber(animatedDeletedFiles)} files pruned
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 tabular-nums">
                <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {formatNumber(animatedSkippedFiles)} active locks preserved
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Snapshot Protected
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <TactileButton
                variant="primary"
                size="hero"
                pill
                onClick={() => {
                  setCompletionReceipt(null);
                  setSuccessCelebration(false);
                }}
              >
                Continue Gardening
              </TactileButton>
              <button
                type="button"
                onClick={() => setActiveTab("snapshots")}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 underline decoration-dotted underline-offset-4"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Undo with Snapshot
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <PixelBadge label="System Health" variant={healthScore > 80 ? "green" : "pink"} />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Active OS: {hostLabel}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {!scanResult
                ? "Ready for a Garden Inspection?"
                : healthScore >= 95
                ? "Your Garden is Sparkling!"
                : healthScore >= 75
                ? "A Few Weeds to Prune!"
                : "Ready for a Fresh Trim!"}
            </h2>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {!scanResult
                ? "Run a safe, non-destructive inspection to discover reclaimable temporary files, package caches, and dev toolchain artifacts."
                : "Miri Cleaner keeps your computer swift, private, and tidy with safety guardrails and pre-flight snapshots."}
            </p>

            {/* Slim consolidated stat strip -- health and ready-to-prune as one
                lightweight row instead of separate parallel cards. */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
              <StatTile value={`${animatedHealthScore}%`} label="Health" valueClassName="text-miri-500 font-pixel" />
              <StatTile value={selectedFormatted.value} suffix={selectedFormatted.unit} label="Ready to Prune" />
            </div>

            {/* ONE big pill primary action -- Scan first, then Prune once ready */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {!scanResult || scanResult.targets.length === 0 ? (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleScan}
                  disabled={isScanning}
                  aria-busy={isScanning}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Scanning..." : "Scan Garden"}
                </TactileButton>
              ) : (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleCleanTrigger}
                  disabled={isCleaning || isScanning || selectedTargetIds.length === 0}
                  aria-busy={isCleaning}
                >
                  <Trash2 className="w-5 h-5 shrink-0" />
                  {isCleaning
                    ? "Pruning Safely..."
                    : dryRun
                    ? `Simulate Trim (${selectedFormatted.formatted})`
                    : `Prune ${selectedFormatted.formatted} Now`}
                </TactileButton>
              )}

              {/* Secondary actions -- visually subordinate to the one primary CTA */}
              <div className="flex items-center gap-4 flex-wrap justify-center text-xs font-bold">
                {scanResult && scanResult.targets.length > 0 && (
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning || isCleaning}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline decoration-dotted underline-offset-4 disabled:opacity-50"
                  >
                    Re-scan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  disabled={isScanning || isCleaning}
                  className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 underline decoration-dotted underline-offset-4 disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Smart Clean
                </button>
                <label className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                  <PixelCheckbox checked={dryRun} onChange={setDryRun} label="Toggle simulation dry run mode" />
                  Simulation mode only
                </label>
              </div>

              {isCleaning && (
                <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden animate-slide-down">
                  <div className="h-full bg-gradient-to-r from-miri-400 via-miri-300 to-miri-500 w-1/2 rounded-full animate-sweep" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SCAN RESULTS -- quick selection controls, then the checklist              */}
      {/* ========================================================================= */}
      {!completionReceipt && scanResult && scanResult.targets.length > 0 && !isScanning && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500 dark:text-slate-400">Quick Selection:</span>
            <button type="button" onClick={selectAll} className="chip-press px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold transition-colors">
              Select All
            </button>
            <button type="button" onClick={handleSelectSafeOnly} className="chip-press px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors">
              Gentle Trim (Safe Only)
            </button>
            <button type="button" onClick={deselectAll} disabled={selectedTargetIds.length === 0} className="chip-press px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-bold transition-colors disabled:opacity-50">
              Clear Selection
            </button>
          </div>
          <span className="text-slate-400 dark:text-slate-500 font-semibold">
            {selectedTargetIds.length} of {scanResult.targets.length} categories selected
          </span>
        </div>
      )}

      {isScanning ? (
        <CardSkeleton count={6} />
      ) : completionReceipt ? null : !scanResult ? null : scanResult.targets.length === 0 ? (
        /* Sparkling Clean Empty State */
        <div className="text-center space-y-3 py-6 animate-fade-in">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            No leftover junk, orphaned caches, or temporary clutter were detected across your system paths.
          </p>
        </div>
      ) : (
        /* Simplified scannable checklist -- lighter borders, more breathing room */
        <div className="space-y-3">
          {scanResult.targets.map((target, index) => {
            const isSelected = selectedTargetIds.includes(target.id);
            const targetFormatted = formatBytes(target.estimated_bytes);
            const theme = getTargetTheme(target);

            return (
              <div
                key={target.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                aria-label={`Toggle ${target.name}`}
                onClick={() => toggleTarget(target.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleTarget(target.id);
                  }
                }}
                style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                className={`cursor-pointer flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all duration-150 ease-out animate-slide-up focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 ${
                  isSelected
                    ? "bg-miri-50/60 border-2 border-miri-300"
                    : "bg-white dark:bg-slate-800 border-2 border-transparent hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <PixelCheckbox checked={isSelected} presentational={true} />
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-150 ${
                      isSelected ? "bg-white dark:bg-slate-800 border-2 border-miri-300" : theme.bg + " border-2"
                    }`}
                  >
                    {theme.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base truncate">{target.name}</h4>
                      {target.requires_elevation ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">Admin</span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">{theme.pill}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold line-clamp-1 mt-0.5">
                      {target.description} &middot; {formatNumber(target.file_count)} files
                    </p>
                  </div>
                </div>
                <div className="font-pixel text-xs text-slate-900 dark:text-slate-100 font-bold shrink-0">{targetFormatted.formatted}</div>
              </div>
            );
          })}
        </div>
      )}

      {showWizard && <SmartCleanWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
};
