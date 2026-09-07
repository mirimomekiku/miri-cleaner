import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { ConfettiBurst } from "../ui/ConfettiBurst";
import { ErrorBanner } from "../ui/ErrorBanner";
import { bridge } from "../../lib/bridge";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { formatBytes } from "../../lib/formatters";
import { celebrationTier } from "./CasualView";
import { AppLeftover, CleanExecutionResult, CleanTarget } from "../../types";
import { ShieldCheck, Sparkles, Trash2, X, CheckCircle2, ArrowRight } from "lucide-react";

const RECOMMENDATION_CAP = 6;

type WizardStep = "analyzing" | "recommendations" | "cleaning" | "done";

interface SmartCleanWizardProps {
  onClose: () => void;
}

/**
 * A guided "what should I do today" flow: analyzes the current scan, ranks
 * safe targets by size, lets the user review the pre-selected picks, then
 * executes through the same bridge.executeClean() path as the manual
 * dashboard -- this is a shortcut through the existing pipeline, not a
 * parallel one.
 */
export const SmartCleanWizard: React.FC<SmartCleanWizardProps> = ({ onClose }) => {
  const { scanResult, setScanResult, addLog, openDangerModal, setLastCleanResult } =
    useCleanerStore();

  const [step, setStep] = useState<WizardStep>(scanResult ? "recommendations" : "analyzing");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [leftovers, setLeftovers] = useState<AppLeftover[]>([]);
  const [includeLeftovers, setIncludeLeftovers] = useState(true);
  const [result, setResult] = useState<CleanExecutionResult | null>(null);
  const errorAction = useAsyncAction();
  const modalRef = useRef<HTMLDivElement>(null);

  const recommendations: CleanTarget[] = useMemo(() => {
    if (!scanResult) return [];
    return [...scanResult.targets]
      .filter((t) => t.risk_level === "safe")
      .sort((a, b) => b.estimated_bytes - a.estimated_bytes)
      .slice(0, RECOMMENDATION_CAP);
  }, [scanResult]);

  // Step 1: Analyzing -- reuse the existing scan if we have one, otherwise
  // run a fresh one. Either way, land on recommendations once ready.
  useEffect(() => {
    if (scanResult) {
      setStep("recommendations");
      return;
    }
    let cancelled = false;
    errorAction.run(async () => {
      const res = await bridge.scanAll();
      if (cancelled) return;
      setScanResult(res);
      setStep("recommendations");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recommendations.length === 0) return;
    setReviewedIds(new Set(recommendations.map((t) => t.id)));
  }, [recommendations]);

  useEffect(() => {
    bridge
      .getLeftovers()
      .then((items) => setLeftovers(items.filter((l) => l.is_removable)))
      .catch(() => {
        // Leftover suggestions are a bonus on top of the main
        // recommendation list; a failed fetch just omits them.
      });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleReviewed = (id: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTargets = recommendations.filter((t) => reviewedIds.has(t.id));
  const selectedBytes = selectedTargets.reduce((acc, t) => acc + t.estimated_bytes, 0);

  const runClean = async () => {
    const ids = Array.from(reviewedIds);
    if (ids.length === 0) return;

    // Keep the shared store's selection in sync with what the wizard is
    // about to clean, so CasualView (which reads the same selectedTargetIds)
    // doesn't disagree with what just happened.
    useCleanerStore.setState({ selectedTargetIds: ids });

    setStep("cleaning");
    addLog(`[Smart Clean] Executing guided cleanup: targets=${ids.length}, leftovers=${includeLeftovers}`);

    await errorAction.run(
      async () => {
        const cleanResult = await bridge.executeClean({
          target_ids: ids,
          dry_run: false,
          create_snapshot: true,
        });
        setLastCleanResult(cleanResult);
        setResult(cleanResult);
        addLog(`[Smart Clean] Freed ${formatBytes(cleanResult.freed_bytes).formatted}.`);

        if (includeLeftovers && leftovers.length > 0) {
          try {
            const leftoverResult = await bridge.cleanLeftovers();
            addLog(`[Smart Clean] Leftovers: ${leftoverResult.details}`);
          } catch (e) {
            // Leftover cleanup is a bonus step; don't fail the whole wizard
            // over it, just note it in the log.
            addLog(`[Smart Clean] Leftover cleanup skipped: ${e}`);
          }
        }

        try {
          const refreshed = await bridge.scanAll();
          setScanResult(refreshed);
        } catch {
          // Silent -- matches CasualView's background refresh behavior.
        }

        setStep("done");
      },
      {
        formatError: (e) => {
          setStep("recommendations");
          const msg = `Smart Clean failed: ${e instanceof Error ? e.message : String(e)}`;
          addLog(msg);
          return msg;
        },
      }
    );
  };

  const handleConfirm = () => {
    const hasDangerous = selectedTargets.some(
      (t) => t.risk_level === "dangerous" || t.risk_level === "aggressive"
    );
    const hasElevation = selectedTargets.some((t) => t.requires_elevation);

    if (hasDangerous || hasElevation) {
      openDangerModal({
        title: "Confirm Smart Clean Plan",
        description: `Miri picked ${selectedTargets.length} safe categories (${
          formatBytes(selectedBytes).formatted
        }) to prune. A pre-execution safety checkpoint will be verified.`,
        targets: selectedTargets,
        requiresElevation: hasElevation,
        riskLevel: hasDangerous ? "dangerous" : "moderate",
        onConfirm: () => runClean(),
      });
    } else {
      runClean();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-clean-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-gradient-to-b from-white to-miri-50/60 rounded-[2rem] max-w-lg w-full p-8 sm:p-10 shadow-duo border-2 border-miri-100 relative animate-pop max-h-[85vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Close Smart Clean wizard"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <Mascot mood={step === "cleaning" ? "cleaning" : step === "done" ? "celebrate" : "scanning"} size="sm" />
          <div>
            <PixelBadge label="Smart Clean" variant="pink" />
            <h3 id="smart-clean-title" className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              {step === "analyzing" && "Analyzing your system..."}
              {step === "recommendations" && "Here's what I'd prune"}
              {step === "cleaning" && "Pruning safely..."}
              {step === "done" && "All done!"}
            </h3>
          </div>
        </div>

        {errorAction.error && (
          <div className="mb-5">
            <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} />
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-10 text-center animate-fade-in">
            <p className="text-sm font-semibold text-slate-500">
              Running a non-destructive inspection to find the safest, highest-impact
              things to clean...
            </p>
          </div>
        )}

        {step === "recommendations" && (
          <div className="space-y-5 animate-slide-up">
            {recommendations.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 text-center py-6">
                Nothing safe to recommend right now -- your system is already tidy.
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-500">
                  Ranked by size, safe-risk targets only. Uncheck anything you'd rather keep.
                </p>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {recommendations.map((target) => {
                    const checked = reviewedIds.has(target.id);
                    return (
                      <div
                        key={target.id}
                        role="checkbox"
                        aria-checked={checked}
                        tabIndex={0}
                        onClick={() => toggleReviewed(target.id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleReviewed(target.id);
                          }
                        }}
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 ${
                          checked
                            ? "border-miri-400 bg-miri-50/40"
                            : "border-slate-100 hover:border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PixelCheckbox checked={checked} presentational label={`Toggle ${target.name}`} />
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-sm truncate">{target.name}</div>
                            <div className="text-[11px] text-slate-500 font-semibold truncate">
                              {target.description}
                            </div>
                          </div>
                        </div>
                        <div className="font-pixel text-xs font-bold text-slate-800 shrink-0">
                          {formatBytes(target.estimated_bytes).formatted}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {leftovers.length > 0 && (
                  <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                    <PixelCheckbox
                      checked={includeLeftovers}
                      onChange={setIncludeLeftovers}
                      label="Also purge orphaned app leftovers"
                    />
                    <span className="text-xs font-semibold text-amber-900">
                      Also found {leftovers.length} orphaned app leftover
                      {leftovers.length === 1 ? "" : "s"} (
                      {formatBytes(leftovers.reduce((acc, l) => acc + l.total_bytes, 0)).formatted}
                      ). Include them in this Smart Clean?
                    </span>
                  </label>
                )}

                <div className="flex flex-col items-center gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500">
                    {selectedTargets.length} selected · {formatBytes(selectedBytes).formatted}
                  </span>
                  <TactileButton
                    variant="primary"
                    size="hero"
                    pill
                    onClick={handleConfirm}
                    disabled={selectedTargets.length === 0}
                  >
                    <Sparkles className="w-5 h-5" />
                    Clean {formatBytes(selectedBytes).formatted}
                    <ArrowRight className="w-5 h-5" />
                  </TactileButton>
                </div>
              </>
            )}
          </div>
        )}

        {step === "cleaning" && (
          <div className="py-10 text-center space-y-3 animate-fade-in">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-miri-400 via-miri-300 to-miri-500 w-1/2 rounded-full animate-sweep" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              Verifying a safety snapshot, then pruning the selected targets...
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="text-center space-y-5 py-4 animate-slide-up">
            <div className="relative inline-flex justify-center">
              <Mascot mood="celebrate" size="lg" />
              <ConfettiBurst tier={celebrationTier(result.freed_bytes)} />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              Freed {formatBytes(result.freed_bytes).formatted}!
            </p>
            <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> {result.deleted_files} files pruned
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Snapshot Protected
              </span>
            </div>
            <TactileButton variant="primary" size="hero" pill onClick={onClose} className="mx-auto">
              <CheckCircle2 className="w-5 h-5" />
              Nice, all set
            </TactileButton>
          </div>
        )}
      </div>
    </div>
  );
};
