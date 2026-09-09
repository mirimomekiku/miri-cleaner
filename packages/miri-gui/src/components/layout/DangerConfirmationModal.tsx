import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { ShieldAlert, KeyRound, Camera, AlertTriangle, X, ChevronDown, Lock, FolderOpen } from "lucide-react";
import { TactileButton } from "../ui/TactileButton";
import { Mascot } from "../ui/Mascot";
import { formatBytes } from "../../lib/formatters";
import { useFocusTrap } from "../../lib/useFocusTrap";

export const DangerConfirmationModal: React.FC = () => {
  const { dangerModal, closeDangerModal } = useCleanerStore();
  const [confirmInput, setConfirmInput] = useState("");
  const [snapshotChecked, setSnapshotChecked] = useState(true);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEscape = useCallback(() => {
    if (!isSubmitting) closeDangerModal();
  }, [isSubmitting, closeDangerModal]);

  const modalRef = useFocusTrap<HTMLDivElement>(dangerModal.isOpen, handleEscape, inputRef);

  useEffect(() => {
    if (!dangerModal.isOpen) return;
    setPreviewExpanded(false);
    setConfirmInput("");
    setConfirmError(null);
    setIsSubmitting(false);
  }, [dangerModal.isOpen]);

  if (!dangerModal.isOpen) return null;

  const confirmWord = dangerModal.confirmWord ?? "CLEAN";
  const isConfirmed = confirmInput.trim().toUpperCase() === confirmWord;

  const handleConfirm = async () => {
    if (!isConfirmed || isSubmitting) return;
    setConfirmError(null);
    setIsSubmitting(true);
    try {
      await dangerModal.onConfirm();
      closeDangerModal();
      setConfirmInput("");
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-modal-title"
      aria-describedby="danger-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) closeDangerModal();
      }}
    >
      <div
        ref={modalRef}
        className="animate-pop bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-red-400 relative"
      >
        {/* Close Button */}
        <button
          onClick={closeDangerModal}
          disabled={isSubmitting}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Mascot Warning */}
        <div className="flex items-center gap-4 mb-4">
          <Mascot mood="alert" size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs text-red-500 uppercase tracking-wide">
                Confirm This Action
              </span>
            </div>
            <h3 id="danger-modal-title" className="text-xl font-black text-slate-900 dark:text-slate-100">
              {dangerModal.title}
            </h3>
          </div>
        </div>

        {/* Description & Impact Box */}
        <div
          id="danger-modal-description"
          className="bg-red-50 dark:bg-red-950/40 rounded-2xl p-4 border border-red-200 dark:border-red-900/60 mb-4 space-y-2"
        >
          <p className="text-sm font-semibold text-red-900 dark:text-red-200 leading-relaxed">
            {dangerModal.description}
          </p>
          {dangerModal.target && (
            <div className="text-xs text-red-800 dark:text-red-300 space-y-1 font-mono pt-2 border-t border-red-200 dark:border-red-900/60">
              <div>Target: {dangerModal.target.name}</div>
              <div>Estimated Size: {formatBytes(dangerModal.target.estimated_bytes).formatted}</div>
              <div>Risk Classification: <span className="uppercase font-bold">{dangerModal.target.risk_level}</span></div>
            </div>
          )}
        </div>

        {/* What Exactly Will Happen -- per-target change preview */}
        {dangerModal.targets && dangerModal.targets.length > 0 && (
          <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setPreviewExpanded((v) => !v)}
              aria-expanded={previewExpanded}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                What exactly will happen ({dangerModal.targets.length}{" "}
                {dangerModal.targets.length === 1 ? "target" : "targets"})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${
                  previewExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={`collapsible-rows ${previewExpanded ? "is-expanded" : ""}`}>
              <div className="collapsible-inner">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {dangerModal.targets.map((t) => (
                    <div key={t.id} className="px-4 py-3 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{t.name}</div>
                      <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 font-mono">
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
                        <span className="break-all">{t.paths.join(", ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <span>{formatBytes(t.estimated_bytes).formatted} across {t.file_count} files</span>
                        {t.locked_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                            <Lock className="w-3 h-3" />
                            {t.locked_count} in use -- will be skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privilege & Snapshot Guardrails */}
        <div className="space-y-3 mb-6">
          {dangerModal.requiresElevation && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Needs Administrator Access:</span> You'll see a system permission prompt (Polkit on Linux, UAC on Windows). Miri itself never runs with elevated access outside that one moment.
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={snapshotChecked}
              onChange={(e) => setSnapshotChecked(e.target.checked)}
              className="w-4 h-4 rounded text-miri-400 focus:ring-miri-400"
            />
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verify & create safety snapshot (Btrfs Snapper / Timeshift / VSS) before execution.</span>
            </div>
          </label>
        </div>

        {/* Type-to-Confirm Gate */}
        <div className="mb-3">
          <label htmlFor="danger-confirm-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            To proceed, type <span className="font-mono font-black text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">{confirmWord}</span> below:
          </label>
          <input
            id="danger-confirm-input"
            ref={inputRef}
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isSubmitting}
            placeholder={confirmWord}
            aria-label={`Type ${confirmWord} to confirm execution`}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 uppercase disabled:opacity-60"
          />
        </div>

        {/* Inline failure from a confirmed action -- the modal stays open so
            the user can retry or cancel, instead of closing regardless of
            outcome and leaving the failure to whatever view is behind it. */}
        <div className="mb-6 min-h-0">
          {confirmError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{confirmError}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <TactileButton variant="secondary" onClick={closeDangerModal} disabled={isSubmitting}>
            Cancel
          </TactileButton>
          <TactileButton
            variant="danger"
            disabled={!isConfirmed || isSubmitting}
            aria-busy={isSubmitting}
            onClick={handleConfirm}
            className={!isConfirmed || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
          >
            <ShieldAlert className="w-4 h-4" />
            {isSubmitting ? "Working..." : "Execute With Safety Snapshot"}
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
