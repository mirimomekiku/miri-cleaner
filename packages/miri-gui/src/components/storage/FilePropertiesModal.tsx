import React, { useEffect, useRef, useState } from "react";
import { X, File, Folder } from "lucide-react";
import { bridge } from "../../lib/bridge";
import { FileProperties } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { useFocusTrap } from "../../lib/useFocusTrap";

interface FilePropertiesModalProps {
  path: string;
  onClose: () => void;
}

/** A small in-app "Properties" panel. Deliberately custom rather than
 * shelling out to a native OS properties dialog, so it looks and behaves
 * identically on Fedora and Windows instead of only really working on one
 * of them. */
export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({ path, onClose }) => {
  const [info, setInfo] = useState<FileProperties | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(true, onClose, closeButtonRef);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    setError(null);
    bridge
      .getFileProperties(path)
      .then((res) => {
        if (!cancelled) setInfo(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const formatDate = (ms: number | null): string => (ms ? new Date(ms).toLocaleString() : "Unknown");

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="File properties"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700/60 shadow-duo p-6 space-y-4 animate-pop"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Properties</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close properties"
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-600">{error}</p>
        ) : !info ? (
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {info.is_dir ? (
                <Folder className="w-5 h-5 text-amber-500 shrink-0" />
              ) : (
                <File className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <span className="font-black text-slate-900 dark:text-slate-100 text-sm break-all">{info.name}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
              {info.path}
            </div>
            <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
              <dt className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] self-center">Size</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{formatBytes(info.size_bytes).formatted}</dd>
              <dt className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] self-center">Type</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{info.is_dir ? "Folder" : "File"}</dd>
              <dt className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] self-center">Modified</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{formatDate(info.modified_ms)}</dd>
              <dt className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] self-center">Created</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{formatDate(info.created_ms)}</dd>
              <dt className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] self-center">Read-only</dt>
              <dd className="font-bold text-slate-800 dark:text-slate-200">{info.readonly ? "Yes" : "No"}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};
