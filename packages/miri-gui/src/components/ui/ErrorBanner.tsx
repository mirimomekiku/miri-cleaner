import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { TactileButton } from "./TactileButton";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

/**
 * Visible, in-page failure surface for async actions. Every view that talks
 * to the native bridge needs one of these: the activity log drawer is closed
 * by default, so a catch block that only calls addLog() fails silently from
 * the user's point of view.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
  retryLabel = "Retry",
  title = "Operation Notice",
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900/60 rounded-3xl p-5 shadow-duo-sm flex items-start justify-between gap-4 animate-slide-down"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-800 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-red-900 dark:text-red-200">{title}</h4>
          <p className="text-xs text-red-700 dark:text-red-300 font-semibold mt-0.5 leading-relaxed break-words">
            {message}
          </p>
          <div className="flex items-center gap-3 mt-3">
            {onRetry && (
              <TactileButton variant="secondary" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3.5 h-3.5" />
                {retryLabel}
              </TactileButton>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-bold text-red-800 dark:text-red-300 hover:text-red-950 dark:hover:text-red-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
            >
              Dismiss Notice
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-xl text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label="Dismiss error notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
