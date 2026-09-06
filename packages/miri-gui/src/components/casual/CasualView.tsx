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
} from "lucide-react";
import { CardSkeleton } from "../ui/Skeleton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { bridge } from "../../lib/bridge";
import { CleanExecutionResult, CleanTarget } from "../../types";
import { formatBytes, formatNumber, calculateHealthScore } from "../../lib/formatters";
import { useCountUp } from "../../lib/useCountUp";
import { useAsyncAction } from "../../lib/useAsyncAction";

/** Scales the completion celebration to the actual amount freed, so a quick
 * temp-file sweep and a multi-gigabyte prune don't get identical fanfare. */
function celebrationTier(freedBytes: number): "modest" | "solid" | "major" {
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
      {/* 2. COMPLETION CELEBRATION RECEIPT (PEAK-END REASSURANCE)                  */}
      {/* ========================================================================= */}
      {completionReceipt && (
        <div
          role="status"
          aria-live="polite"
          className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 rounded-3xl p-7 border-2 border-emerald-300 shadow-duo flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-down"
        >
          <div className="flex items-center gap-5 w-full md:w-auto min-w-0">
            <div className="relative shrink-0">
              <Mascot mood="celebrate" size="lg" />
              {/* Only a real, non-simulated prune earns confetti; a dry run
                  found the same clutter but didn't actually clear it. */}
              {!dryRun && (
                <ConfettiBurst tier={celebrationTier(completionReceipt.freed_bytes)} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 font-pixel">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All Trimmed & Fresh
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Gardening Receipt
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 truncate">
                {dryRun ? "Simulation Complete!" : "Hooray! Freshly Polished!"}
              </h3>
              <p className="text-xs text-slate-600 font-semibold mt-1 max-w-md leading-relaxed break-words">
                {dryRun
                  ? `Simulated clean finished. In live mode, this would safely reclaim ${
                      formatBytes(completionReceipt.freed_bytes).formatted
                    }.`
                  : `Successfully cleared ${
                      formatBytes(completionReceipt.freed_bytes).formatted
                    }. A verified snapshot was registered before pruning.`}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs font-bold text-slate-700 flex-wrap">
                <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 tabular-nums">
                  🗑️ {formatNumber(animatedDeletedFiles)} files pruned
                </span>
                <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 tabular-nums">
                  🔒 {formatNumber(animatedSkippedFiles)} active locks preserved
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Snapshot Protected
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("snapshots")}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              Undo with Snapshot
            </TactileButton>
            <TactileButton
              variant="primary"
              size="sm"
              onClick={() => {
                setCompletionReceipt(null);
                setSuccessCelebration(false);
              }}
              className="w-full sm:w-auto"
            >
              Continue Gardening
            </TactileButton>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HERO HEALTH BANNER                                                     */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-white to-miri-50 rounded-3xl p-8 border-2 border-miri-200 shadow-duo flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto min-w-0">
          <Mascot
            mood={
              errorAction.error
                ? "alert"
                : successCelebration
                ? "celebrate"
                : isScanning
                ? "scanning"
                : isCleaning
                ? "cleaning"
                : "happy"
            }
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PixelBadge
                label="System Health"
                variant={healthScore > 80 ? "green" : "pink"}
              />
              <span className="text-xs font-bold text-slate-600">
                Active OS: {hostLabel}
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight truncate">
              {healthScore >= 95
                ? "Your Garden is Sparkling!"
                : healthScore >= 75
                ? "A Few Weeds to Prune!"
                : "Ready for a Fresh Trim!"}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-1 max-w-md leading-relaxed break-words">
              Miri Cleaner keeps your computer swift, private, and tidy with zero-trust
              safety guardrails and pre-flight snapshots.
            </p>
          </div>
        </div>

        {/* Health Score Gauge */}
        <div className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm flex items-center gap-4 shrink-0">
          <div className="text-center min-w-[80px]">
            <div className="text-3xl font-black text-miri-500 font-pixel tabular-nums">
              {animatedHealthScore}%
            </div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              Health Index
            </div>
          </div>
          <div className="h-10 w-[2px] bg-slate-200" />
          <div className="text-center min-w-[90px]">
            <div className="text-3xl font-black text-slate-800 font-sans">
              {selectedFormatted.value}
              <span className="text-xs font-bold text-slate-500 ml-1">
                {selectedFormatted.unit}
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              Ready to Prune
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN ACTION BAR & PRESETS                                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <PixelCheckbox
                checked={dryRun}
                onChange={setDryRun}
                label="Toggle simulation dry run mode"
              />
              <span>Simulation Mode (Test run without deleting files)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <TactileButton
              variant="secondary"
              onClick={handleScan}
              disabled={isScanning || isCleaning}
              aria-busy={isScanning}
              className="flex-1 sm:flex-none min-w-0"
            >
              <Sparkles className={`w-4 h-4 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
              <span className="truncate">{isScanning ? "Scanning..." : "Scan Garden"}</span>
            </TactileButton>

            <TactileButton
              variant="primary"
              onClick={handleCleanTrigger}
              disabled={isCleaning || isScanning || selectedTargetIds.length === 0}
              aria-busy={isCleaning}
              size="lg"
              className="flex-1 sm:flex-none min-w-0"
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              <span className="truncate">
                {isCleaning
                  ? "Pruning Safely..."
                  : dryRun
                  ? `Simulate Trim (${selectedFormatted.formatted})`
                  : `Prune ${selectedFormatted.formatted} Now`}
              </span>
            </TactileButton>
          </div>
        </div>

        {/* Cleaning Progress Bar (Active Sweeping Indicator) */}
        {isCleaning && (
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden animate-slide-down">
            <div className="h-full bg-gradient-to-r from-miri-400 via-miri-300 to-miri-500 w-1/2 rounded-full animate-sweep" />
          </div>
        )}

        {/* Preset Filters Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">Quick Selection:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={selectAll}
                disabled={!scanResult || scanResult.targets.length === 0}
                className="chip-press px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleSelectSafeOnly}
                disabled={!scanResult || scanResult.targets.length === 0}
                className="chip-press px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Gentle Trim (Safe Only)
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={selectedTargetIds.length === 0}
                className="chip-press px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Clear Selection
              </button>
            </div>
          </div>
          <span className="text-slate-500 font-semibold">
            {selectedTargetIds.length} of {scanResult?.targets.length || 0} categories selected
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. QUICK CATEGORY CARDS GRID / SKELETON / EMPTY STATES                    */}
      {/* ========================================================================= */}
      {isScanning ? (
        <CardSkeleton count={6} />
      ) : !scanResult ? (
        /* Initial Ready State (Scan not yet triggered or needs scan) */
        <div className="bg-white rounded-3xl p-10 border-2 border-slate-100 shadow-duo text-center space-y-4 animate-fade-in">
          <div className="flex justify-center">
            <Mascot mood="happy" size="lg" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Garden Inspection Ready
          </h3>
          <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed">
            Run a safe, non-destructive inspection to discover reclaimable temporary files, package caches, and dev toolchain artifacts.
          </p>
          <div className="pt-2 flex justify-center">
            <TactileButton variant="primary" onClick={handleScan}>
              <Search className="w-4 h-4" />
              Start System Scan
            </TactileButton>
          </div>
        </div>
      ) : scanResult.targets.length === 0 ? (
        /* Sparkling Clean Empty State */
        <div className="bg-white rounded-3xl p-10 border-2 border-emerald-200 shadow-duo text-center space-y-4 animate-fade-in">
          <div className="relative flex justify-center">
            <Mascot mood="celebrate" size="lg" />
            <ConfettiBurst tier="solid" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Your Garden is 100% Sparkling Clean!
          </h3>
          <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed">
            No leftover junk, orphaned caches, or temporary clutter were detected across your system paths.
          </p>
          <div className="pt-2 flex justify-center">
            <TactileButton variant="secondary" onClick={handleScan}>
              <RefreshCw className="w-4 h-4" />
              Check Again
            </TactileButton>
          </div>
        </div>
      ) : (
        /* Populated Target Grid with Tactile Motion */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                // Reveal as a considered list, not a flat block: stagger
                // capped at 300ms total so a long scan result doesn't make
                // the last cards feel delayed.
                style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                className={`card-duo cursor-pointer flex items-center justify-between gap-4 transition-all duration-150 ease-out animate-slide-up focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 ${
                  isSelected
                    ? "border-miri-400 bg-miri-50/40 shadow-duo"
                    : "hover:border-slate-300 opacity-95"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Presentational Checkbox with Pop Animation */}
                  <PixelCheckbox
                    checked={isSelected}
                    presentational={true}
                  />

                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-150 ${
                      isSelected
                        ? "bg-white border-miri-400 shadow-duo-sm"
                        : theme.bg
                    }`}
                  >
                    {theme.icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-sm md:text-base truncate">
                        {target.name}
                      </h4>
                      {target.requires_elevation ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                          {theme.pill}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-semibold line-clamp-1 mt-0.5">
                      {target.description}
                    </p>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">
                      {formatNumber(target.file_count)} files inspected
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-pixel text-xs text-slate-900 font-bold">
                    {targetFormatted.formatted}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
