import React, { useMemo, useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Terminal, X, Trash2, Copy, Check, Search } from "lucide-react";

type LogSeverity = "error" | "success" | "warning" | "info";

const SEVERITY_STYLES: Record<
  LogSeverity,
  { dot: string; text: string; glyph: string }
> = {
  error: { dot: "bg-red-400", text: "text-red-300", glyph: "text-red-400" },
  success: { dot: "bg-emerald-400", text: "text-emerald-300", glyph: "text-emerald-400" },
  warning: { dot: "bg-amber-400", text: "text-amber-300", glyph: "text-amber-400" },
  info: { dot: "bg-miri-400", text: "text-slate-300", glyph: "text-miri-400" },
};

/** Classifies a log line for color-coded scanability. Heuristic on the
 * message text itself since log lines are plain strings, not structured. */
function classify(line: string): LogSeverity {
  const l = line.toLowerCase();
  if (/(error|failed|halted)\b/.test(l)) return "error";
  if (/(warning|deferred|caution)\b/.test(l)) return "warning";
  if (/(success|complete|freed|applied|ready|initialized|mounted|ok\b)/.test(l)) return "success";
  return "info";
}

export const LogDrawer: React.FC = () => {
  const { logDrawerOpen, toggleLogDrawer, logs, clearLogs } = useCleanerStore();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter((l) => l.toLowerCase().includes(q));
  }, [logs, query]);

  if (!logDrawerOpen) return null;

  const handleCopyAll = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="shrink-0 h-60 max-h-[35vh] bg-slate-950 rounded-t-3xl border-2 border-b-0 border-miri-400/70 text-slate-200 font-mono text-xs flex flex-col shadow-2xl transition-all select-text z-30 animate-slide-up overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-miri-400/15 border border-miri-400/40 flex items-center justify-center shrink-0">
            <Terminal className="w-3.5 h-3.5 text-miri-400" />
          </div>
          <span className="font-bold text-slate-200 font-sans truncate">
            Live Execution &amp; Dry-Run Activity Stream
          </span>
          <span className="pixel-tag bg-slate-800 text-miri-300 border-slate-700 shrink-0">
            {logs.length} {logs.length === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter events..."
              aria-label="Filter activity log events"
              className="text-[11px] font-sans bg-slate-800/80 border border-slate-700 rounded-lg pl-7 pr-2 py-1 w-36 text-slate-200 placeholder-slate-500 outline-none focus:border-miri-400 focus-visible:ring-2 focus-visible:ring-miri-400/60"
            />
          </div>
          <button
            onClick={handleCopyAll}
            disabled={logs.length === 0}
            aria-label="Copy all activity logs"
            title="Copy All"
            className="chip-press w-9 h-9 flex items-center justify-center shrink-0 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400/60"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={clearLogs}
            disabled={logs.length === 0}
            aria-label="Clear activity logs"
            title="Clear Logs"
            className="chip-press w-9 h-9 flex items-center justify-center shrink-0 text-slate-400 hover:text-red-300 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400/60"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleLogDrawer}
            aria-label="Close terminal activity drawer"
            title="Close Drawer"
            className="chip-press w-9 h-9 flex items-center justify-center shrink-0 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Streaming Terminal Output */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center text-slate-500 select-none">
            <Terminal className="w-6 h-6 text-slate-700" />
            <p className="font-sans font-bold text-slate-400">Console is quiet</p>
            <p className="font-sans text-[11px] max-w-xs">
              Scans, cleans, and tweak actions will stream their activity here.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-1 text-center text-slate-500 select-none font-sans">
            <p className="font-bold text-slate-400">No events match &ldquo;{query}&rdquo;</p>
            <p className="text-[11px]">Try a different filter term.</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const severity = classify(log);
            const styles = SEVERITY_STYLES[severity];
            return (
              <div key={index} className="flex items-start gap-2 leading-relaxed">
                <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                <span className={`shrink-0 ${styles.glyph}`}>❯</span>
                <span className={styles.text}>{log}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
