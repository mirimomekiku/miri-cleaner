import React, { useState, useEffect, useRef } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { ShieldAlert, KeyRound, Camera, AlertTriangle, X } from "lucide-react";
import { TactileButton } from "../ui/TactileButton";
import { Mascot } from "../ui/Mascot";
import { formatBytes } from "../../lib/formatters";

export const DangerConfirmationModal: React.FC = () => {
  const { dangerModal, closeDangerModal } = useCleanerStore();
  const [confirmInput, setConfirmInput] = useState("");
  const [snapshotChecked, setSnapshotChecked] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dangerModal.isOpen) return;

    // Auto-focus input on open
    const timer = setTimeout(() => inputRef.current?.focus(), 50);

    // Escape listener and focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDangerModal();
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
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dangerModal.isOpen, closeDangerModal]);

  if (!dangerModal.isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === "CLEAN";

  const handleConfirm = () => {
    if (!isConfirmed) return;
    dangerModal.onConfirm();
    closeDangerModal();
    setConfirmInput("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-modal-title"
      aria-describedby="danger-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDangerModal();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-red-400 relative"
      >
        {/* Close Button */}
        <button
          onClick={closeDangerModal}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Mascot Warning */}
        <div className="flex items-center gap-4 mb-4">
          <Mascot mood="alert" size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs text-red-500 uppercase tracking-wide">
                Security & Danger Hardening
              </span>
            </div>
            <h3 id="danger-modal-title" className="text-xl font-black text-slate-900">
              {dangerModal.title}
            </h3>
          </div>
        </div>

        {/* Description & Impact Box */}
        <div
          id="danger-modal-description"
          className="bg-red-50 rounded-2xl p-4 border border-red-200 mb-4 space-y-2"
        >
          <p className="text-sm font-semibold text-red-900 leading-relaxed">
            {dangerModal.description}
          </p>
          {dangerModal.target && (
            <div className="text-xs text-red-800 space-y-1 font-mono pt-2 border-t border-red-200">
              <div>Target: {dangerModal.target.name}</div>
              <div>Estimated Size: {formatBytes(dangerModal.target.estimated_bytes).formatted}</div>
              <div>Risk Classification: <span className="uppercase font-bold">{dangerModal.target.risk_level}</span></div>
            </div>
          )}
        </div>

        {/* Privilege & Snapshot Guardrails */}
        <div className="space-y-3 mb-6">
          {dangerModal.requiresElevation && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privilege Escalation Required:</span> This operation will trigger an explicit Polkit (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">pkexec</code>) or Windows UAC prompt. The main GUI remains unprivileged.
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 cursor-pointer">
            <input
              type="checkbox"
              checked={snapshotChecked}
              onChange={(e) => setSnapshotChecked(e.target.checked)}
              className="w-4 h-4 rounded text-miri-400 focus:ring-miri-400"
            />
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Verify & create safety snapshot (Btrfs Snapper / Timeshift / VSS) before execution.</span>
            </div>
          </label>
        </div>

        {/* Type-to-Confirm Gate */}
        <div className="mb-6">
          <label htmlFor="danger-confirm-input" className="block text-xs font-bold text-slate-700 mb-1.5">
            To proceed, type <span className="font-mono font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded">CLEAN</span> below:
          </label>
          <input
            id="danger-confirm-input"
            ref={inputRef}
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="CLEAN"
            aria-label="Type CLEAN to confirm execution"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 uppercase"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <TactileButton variant="secondary" onClick={closeDangerModal}>
            Cancel
          </TactileButton>
          <TactileButton
            variant="danger"
            disabled={!isConfirmed}
            onClick={handleConfirm}
            className={!isConfirmed ? "opacity-50 cursor-not-allowed" : ""}
          >
            <ShieldAlert className="w-4 h-4" />
            Execute With Safety Snapshot
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
