import React, { useState, useEffect } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import {
  Shield,
  ShieldCheck,
  RotateCcw,
  FileCheck,
  ChevronDown,
  HardDrive,
  Zap,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { SnapshotStatus, AuditEntry, SystemVitalsReport } from "../../types";
import { VitalsSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { BatteryHealthCard } from "./BatteryHealthCard";
import { BatterySample, getBatteryHistory, recordBatterySample } from "../../lib/batteryHistory";

export const SnapshotsView: React.FC = () => {
  const { viewMode, addLog, openDangerModal } = useCleanerStore();

  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vitals, setVitals] = useState<SystemVitalsReport | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [batteryHistory, setBatteryHistory] = useState<BatterySample[]>(() => getBatteryHistory());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const errorAction = useAsyncAction();

  const loadAll = async () => {
    setIsLoading(true);
    await errorAction.run(async () => {
      const results = await Promise.allSettled([
        bridge.getSnapshotStatus().then(setSnapshotStatus),
        bridge.getAuditHistory().then(setAuditEntries),
        bridge.getVitals().then((v) => {
          setVitals(v);
          if (v.battery && v.battery.health_percentage != null) {
            setBatteryHistory(
              recordBatterySample(v.battery.health_percentage, v.battery.cycle_count ?? null)
            );
          }
        }),
      ]);
      const failures = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      if (failures.length > 0) {
        const msg = `Loading snapshot & vitals data failed: ${failures
          .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
          .join("; ")}`;
        addLog(msg);
        throw new Error(msg);
      }
    });
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompactSnapshots = (days: number) => {
    openDangerModal({
      title: `Compact Snapshots Older Than ${days} Days`,
      description: `Purges old safety checkpoints created more than ${days} days ago. Recent restore checkpoints are preserved. Reclaims ~${
        formatBytes((vitals?.snapshot_compactor.estimated_reclaimable_mb || 0) * 1024 * 1024).formatted
      }.`,
      requiresElevation: true,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsCompacting(true);
        addLog(`[Compactor] Pruning snapshots older than ${days} days...`);
        await errorAction.run(
          async () => {
            const res = await bridge.compactSnapshots(days);
            addLog(`[Compactor] ${res}`);
            const updated = await bridge.getVitals();
            setVitals(updated);
          },
          {
            formatError: (e) => {
              addLog(`[Compactor] Error: ${e}`);
              return `Compacting snapshots failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsCompacting(false);
      },
    });
  };

  const handleSetPowerProfile = async (profile: string) => {
    addLog(`[Power] Switching system power profile to: ${profile}`);
    await errorAction.run(
      async () => {
        const res = await bridge.setPowerProfile(profile);
        addLog(`[Power] ${res}`);
        const updated = await bridge.getVitals();
        setVitals(updated);
      },
      {
        formatError: (e) => {
          addLog(`[Power] Error: ${e}`);
          return `Switching power profile failed: ${e instanceof Error ? e.message : String(e)}`;
        },
      }
    );
  };


  const handleRollback = (auditId: string) => {
    openDangerModal({
      title: `Rollback Cleanup: ${auditId}`,
      description: "Restores files and settings to the pre-cleanup snapshot checkpoint created for this operation.",
      requiresElevation: true,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`Initiating rollback for transaction: ${auditId}`);
        await errorAction.run(
          async () => {
            const details = await bridge.rollbackSnapshot(auditId);
            addLog(`Rollback complete for ${auditId}: ${details}`);
            const refreshed = await bridge.getAuditHistory();
            setAuditEntries(refreshed);
          },
          {
            formatError: (e) => {
              addLog(`Rollback error: ${e}`);
              return `Rollback failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  const handleCreateSnapshot = () => {
    openDangerModal({
      title: "Create Manual Safety Checkpoint",
      description: "Takes an immediate system snapshot (Btrfs subvolume or Windows VSS shadow copy) for manual safety peace-of-mind.",
      requiresElevation: true,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog("Creating manual pre-flight snapshot...");
        await errorAction.run(
          async () => {
            await new Promise((r) => setTimeout(r, 600));
            const refreshedStatus = await bridge.getSnapshotStatus();
            setSnapshotStatus(refreshedStatus);
            addLog("Manual safety checkpoint verified.");
          },
          {
            formatError: (e) => {
              addLog(`Snapshot creation error: ${e}`);
              return `Creating a manual snapshot failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} />
      )}
      {/* ========================================================================= */}
      {/* CASUAL VIEW MODE */}
      {/* ========================================================================= */}
      {isLoading ? (
        <VitalsSkeleton />
      ) : viewMode === "casual" ? (
        <>
          {/* ================================================================= */}
          {/* ONE HERO MODULE -- lesson-screen grammar: a single dominant focal  */}
          {/* card replacing the old header card + separate history card. The   */}
          {/* provider status and recent-activity count collapse into a slim    */}
          {/* stat strip, cleanup history tucks behind an expand toggle, and    */}
          {/* one big pill action drives the obvious next step.                */}
          {/* ================================================================= */}
          <div className="bg-gradient-to-b from-white to-sky-50/60 rounded-[2rem] p-10 sm:p-12 border-2 border-sky-100 shadow-duo text-center space-y-6">
            <div className="flex justify-center">
              <Mascot mood={isProcessing ? "cleaning" : "happy"} size="lg" />
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <PixelBadge label="Safety & Rollback" variant="blue" />
              <span className="text-xs font-bold text-slate-400">Btrfs Snapper • Windows VSS</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              System Safety Checkpoints
            </h2>
            <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
              Automatic safety checkpoints ensure every cleanup is reversible.
              Undo any operation anytime with a single tap.
            </p>

            {/* Slim consolidated stat strip -- provider status and history    */}
            {/* count instead of a separate parallel "readiness pill" card.    */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-2xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Protected</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-black text-slate-800 max-w-[10rem] truncate">
                  {snapshotStatus?.provider_name || "Btrfs / VSS Ready"}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Snapshot Shield</div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryExpanded((v) => !v)}
                aria-expanded={historyExpanded}
                className="text-center group"
              >
                <div className="text-2xl font-black text-slate-800 tabular-nums flex items-center gap-1 justify-center">
                  {auditEntries.length}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${historyExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                  {historyExpanded ? "Hide History" : "Cleanup History"}
                </div>
              </button>
            </div>

            {/* Battery Health Trend (desktops without a battery show nothing here) */}
            {vitals?.battery && (
              <div className="text-left pt-2">
                <BatteryHealthCard battery={vitals.battery} history={batteryHistory} />
              </div>
            )}

            {/* Disk Health & Power Profile -- real system readings, previously
                fetched but never shown anywhere in this view. */}
            {vitals && (vitals.disk_health.total_gb > 0 || vitals.power_profile) && (
              <div className="text-left pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vitals.disk_health.total_gb > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 mb-2">
                      <HardDrive className="w-4 h-4 text-sky-600" />
                      <span>{vitals.disk_health.filesystem} Root Volume</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{
                          width: `${Math.min(100, (vitals.disk_health.used_gb / Math.max(vitals.disk_health.total_gb, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1.5">
                      {vitals.disk_health.used_gb.toFixed(1)} GB used of {vitals.disk_health.total_gb.toFixed(1)} GB
                      {vitals.disk_health.is_btrfs && " · Btrfs"}
                    </div>
                  </div>
                )}
                {vitals.power_profile && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 mb-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Power Profile</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vitals.power_profile.available_profiles.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSetPowerProfile(p)}
                          className={`chip-press px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            p === vitals.power_profile?.active_profile
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Secondary content tucked behind expansion, per the lesson-screen brief */}
            <div className={`collapsible-rows ${historyExpanded ? "is-expanded" : ""}`}>
              <div className="collapsible-inner">
                <div className="pt-4 text-left">
                  {auditEntries.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      No cleanups have been performed yet. Your system is protected by default snapshots.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditEntries.slice(0, 3).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-black text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                              <span>{entry.operation === "system-clean" ? "System Cleanup" : "Dry-Run Simulation"}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Verified Safe
                              </span>
                              {entry.is_rolled_back && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  Rolled Back
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 mt-1">
                              Freed: <span className="font-bold text-slate-700">{formatBytes(entry.freed_bytes).formatted}</span> • {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>

                          <TactileButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRollback(entry.id)}
                            disabled={isProcessing || entry.is_rolled_back}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {entry.is_rolled_back ? "Already Rolled Back" : "Undo This Clean"}
                          </TactileButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ONE big pill primary action */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <TactileButton
                variant="primary"
                size="hero"
                pill
                onClick={handleCreateSnapshot}
                disabled={isProcessing}
                aria-busy={isProcessing}
              >
                <Shield className="w-5 h-5 shrink-0" />
                {isProcessing ? "Working..." : "Create Safety Checkpoint Now"}
              </TactileButton>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* ADVANCED VIEW MODE */
        /* ========================================================================= */
        <>
          {/* Advanced Header */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <PixelBadge label="Advanced" variant="blue" />
                <span className="text-xs font-bold text-slate-400">
                  Zero-Trust Audit Journal & Subvolume Recovery
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Safety Checkpoints & Rollback History
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <TactileButton
                variant="primary"
                size="sm"
                onClick={handleCreateSnapshot}
                disabled={isProcessing}
              >
                <Shield className="w-4 h-4" />
                Create Snapshot Checkpoint
              </TactileButton>
            </div>
          </div>

          {/* Provider Details Card */}
          <div className="card-duo">
            <h3 className="text-lg font-black text-slate-900 mb-2">Pre-Flight Safety Snapshots</h3>
            <p className="text-xs text-slate-500 mb-4">
              Miri Cleaner integrates directly with Snapper (Btrfs root subvolumes) and Timeshift on Linux, and Windows System Restore (VSS) on Windows 10/11.
            </p>
            {snapshotStatus && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-center gap-4">
                <Shield className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950 text-sm">{snapshotStatus.provider_name}</div>
                  <p className="text-xs text-emerald-800 mt-0.5">{snapshotStatus.details}</p>
                  <div className="text-[11px] font-mono text-emerald-700 mt-1">
                    Active checkpoint tag: {snapshotStatus.last_snapshot}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audit History Card */}
          <div className="card-duo space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <h3 className="text-lg font-black text-slate-900">Immutable Audit Journal (`audit.json`)</h3>
              <span className="text-xs font-mono text-slate-400">{auditEntries.length} entries recorded</span>
            </div>

            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-800 flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{entry.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-sans">
                        {entry.operation}
                      </span>
                      {entry.is_rolled_back && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-sans">
                          Rolled Back
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 mt-1">
                      Freed: <span className="font-bold text-slate-700">{formatBytes(entry.freed_bytes).formatted}</span> • Targets: {entry.target_ids.join(", ")}
                    </div>
                    {entry.snapshot_id && (
                      <div className="text-emerald-700 font-mono text-[11px] mt-0.5">
                        Snapshot Link: {entry.snapshot_id}
                      </div>
                    )}
                  </div>

                  <TactileButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRollback(entry.id)}
                    disabled={isProcessing || entry.is_rolled_back}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {entry.is_rolled_back ? "Rolled Back" : "Rollback"}
                  </TactileButton>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
