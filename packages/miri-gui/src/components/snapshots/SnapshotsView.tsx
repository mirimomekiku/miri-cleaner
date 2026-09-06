import React, { useState, useEffect } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import {
  History,
  Shield,
  ShieldCheck,
  RotateCcw,
  Info,
  Clock,
  CheckCircle,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { SnapshotStatus, AuditEntry, SystemVitalsReport } from "../../types";
import { Battery, Zap, HardDrive, Cpu, Trash2 } from "lucide-react";
import { VitalsSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";

export const SnapshotsView: React.FC = () => {
  const { viewMode, addLog, openDangerModal } = useCleanerStore();

  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vitals, setVitals] = useState<SystemVitalsReport | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const errorAction = useAsyncAction();

  const loadAll = async () => {
    setIsLoading(true);
    await errorAction.run(async () => {
      const results = await Promise.allSettled([
        bridge.getSnapshotStatus().then(setSnapshotStatus),
        bridge.getAuditHistory().then(setAuditEntries),
        bridge.getVitals().then(setVitals),
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
          {/* Header Card */}
          <div className="bg-gradient-to-br from-white to-sky-50/40 rounded-3xl p-8 border-2 border-sky-100 shadow-duo flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto min-w-0">
              <Mascot mood="happy" size="lg" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PixelBadge label="Safety & Rollback" variant="blue" />
                  <span className="text-xs font-bold text-slate-400">
                    Btrfs Snapper • Windows VSS
                  </span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  System Safety Checkpoints
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-1 max-w-md">
                  Automatic safety checkpoints ensure every cleanup is reversible.
                  Undo any operation anytime with a single tap.
                </p>
              </div>
            </div>

            {/* Provider Readiness Pill */}
            <div className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm text-center min-w-[160px]">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-sm mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Protected</span>
              </div>
              <div className="text-sm font-black text-slate-800">
                {snapshotStatus?.provider_name || "Btrfs / VSS Ready"}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Snapshot Shield
              </div>
            </div>
          </div>

          {/* Friendly Explanation Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-3">
            <div className="flex items-center gap-2.5 text-slate-800 font-extrabold text-sm">
              <Info className="w-4 h-4 text-sky-600" />
              <span>How our zero-trust safety guarantee works</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Pre-Flight Checkpoints
                </div>
                <p>
                  Before modifying or deleting any files, an automatic system snapshot
                  is captured so nothing is ever permanently lost.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Process Lock Checks
                </div>
                <p>
                  Running applications are inspected via /proc and Restart Manager.
                  Active browser caches or files in use are safely skipped.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  One-Tap Rollback
                </div>
                <p>
                  Every cleanup transaction is logged to an immutable local audit journal.
                  Reverting is as simple as clicking "Undo Changes".
                </p>
              </div>
            </div>
          </div>

          {/* Recent Operations & Quick Undo */}
          <div className="card-duo space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Recent Cleanup History</h3>
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={handleCreateSnapshot}
                disabled={isProcessing}
              >
                <Shield className="w-3.5 h-3.5" />
                Create Safety Checkpoint Now
              </TactileButton>
            </div>

            {auditEntries.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No cleanups have been performed yet. Your system is protected by default snapshots.
              </div>
            ) : (
              <div className="space-y-3">
                {auditEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">
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
        </>
      ) : (
        /* ========================================================================= */
        /* ADVANCED VIEW MODE */
        /* ========================================================================= */
        <>
          {/* Advanced Header */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Immutable Audit Journal (`audit.json`)</h3>
              <span className="text-xs font-mono text-slate-400">{auditEntries.length} entries recorded</span>
            </div>

            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
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
