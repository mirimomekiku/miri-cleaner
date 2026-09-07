import React, { useEffect, useState } from "react";
import { Mascot } from "../ui/Mascot";
import { PixelBadge } from "../ui/PixelBadge";
import { bridge } from "../../lib/bridge";
import { formatBytes, formatNumber } from "../../lib/formatters";
import { computeWeeklyDigest, hasShownDigestThisWeek, markDigestShown, WeeklyDigest } from "../../lib/weeklyDigest";
import { useCleanerStore } from "../../store/useCleanerStore";
import { ShieldCheck, X } from "lucide-react";

/**
 * A once-per-week dismissible summary of what Miri actually did, so the
 * safety story ("snapshots before every real clean") is demonstrated with
 * real numbers instead of only claimed in copy. Renders nothing if there's
 * no meaningful activity to report or it's already been shown this week.
 */
export const WeeklyDigestCard: React.FC = () => {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const addLog = useCleanerStore((s) => s.addLog);

  useEffect(() => {
    if (hasShownDigestThisWeek()) return;
    let cancelled = false;
    bridge
      .getAuditHistory()
      .then((entries) => {
        if (cancelled) return;
        const computed = computeWeeklyDigest(entries);
        if (computed.operationCount > 0) {
          setDigest(computed);
        }
      })
      .catch((e) => {
        // The digest is a nice-to-have retention hook, not core
        // functionality -- a failed fetch just means it stays hidden, but
        // it's still logged so a failure isn't completely invisible.
        if (cancelled) return;
        addLog(`Weekly digest unavailable: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!digest || dismissed) return null;

  const handleDismiss = () => {
    markDigestShown();
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="relative bg-gradient-to-br from-sky-50 via-white to-miri-50/60 rounded-3xl p-6 border-2 border-sky-200 shadow-duo-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 animate-slide-down"
    >
      <Mascot mood="happy" size="md" />
      <div className="flex-1 min-w-0 w-full pr-6 sm:pr-8 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
          <PixelBadge label="Weekly Digest" variant="blue" />
        </div>
        <p className="text-sm font-bold text-slate-800 leading-relaxed">
          This week Miri freed{" "}
          <span className="text-sky-700">{formatBytes(digest.freedBytes).formatted}</span>, across{" "}
          {formatNumber(digest.operationCount)} cleanup{digest.operationCount === 1 ? "" : "s"}
          {digest.snapshotCount > 0 && (
            <>
              , with{" "}
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                {formatNumber(digest.snapshotCount)} safety snapshot{digest.snapshotCount === 1 ? "" : "s"}
              </span>{" "}
              registered before anything was touched
            </>
          )}
          .
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss weekly digest"
        className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
