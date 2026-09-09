import React, { useEffect, useState } from "react";
import { HardDrive, Thermometer, ShieldAlert, ChevronDown, KeyRound } from "lucide-react";
import { bridge } from "../../lib/bridge";
import { DiskHealthInfo, DiskHealthReport } from "../../types";
import { PixelBadge } from "../ui/PixelBadge";
import { TactileButton } from "../ui/TactileButton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { notify } from "../../lib/notify";

const statusVariant = (status: string): "green" | "yellow" | "red" | "gray" => {
  switch (status) {
    case "healthy":
      return "green";
    case "warning":
      return "yellow";
    case "critical":
      return "red";
    default:
      return "gray";
  }
};

const statusLabel = (status: string): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Needs Attention";
    case "critical":
      return "Failing";
    default:
      return "Unknown";
  }
};

const formatHours = (hours: number | null): string => {
  if (hours == null) return "Unknown";
  const days = Math.round(hours / 24);
  return `${hours.toLocaleString()} hrs (~${days.toLocaleString()} days)`;
};

const DiskCard: React.FC<{ disk: DiskHealthInfo; onRecheck: () => void; rechecking: boolean }> = ({
  disk,
  onRecheck,
  rechecking,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!disk.available) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
          <HardDrive className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>{disk.device}</span>
        </div>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{disk.unavailable_reason}</p>
        <TactileButton variant="secondary" size="sm" onClick={onRecheck} disabled={rechecking}>
          <KeyRound className="w-3.5 h-3.5" />
          {rechecking ? "Checking..." : "Check With Admin Access"}
        </TactileButton>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
          <HardDrive className="w-4 h-4 text-sky-600" />
          <span>{disk.model}</span>
        </div>
        <PixelBadge label={statusLabel(disk.overall_status)} variant={statusVariant(disk.overall_status)} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
          <Thermometer className="w-3.5 h-3.5" />
          Temperature
        </div>
        <div className="font-bold text-slate-800 dark:text-slate-200">
          {disk.temperature_celsius != null ? `${disk.temperature_celsius}°C` : "Unknown"}
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-semibold">Power-on Time</div>
        <div className="font-bold text-slate-800 dark:text-slate-200">{formatHours(disk.power_on_hours)}</div>
        {disk.percentage_used != null ? (
          <>
            <div className="text-slate-500 dark:text-slate-400 font-semibold">SSD Wear</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">{disk.percentage_used}% used</div>
          </>
        ) : (
          <>
            <div className="text-slate-500 dark:text-slate-400 font-semibold">Reallocated Sectors</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">{disk.reallocated_sectors ?? "Unknown"}</div>
          </>
        )}
      </div>

      {(disk.overall_status === "warning" || disk.overall_status === "critical") && (
        <div className="flex items-start gap-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This drive is reporting early warning signs of failure. Back up anything important
            soon, just in case.
          </span>
        </div>
      )}

      {disk.attributes.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide full SMART attributes" : "Show full SMART attributes"}
          </button>
          <div className={`collapsible-rows ${expanded ? "is-expanded" : ""}`}>
            <div className="collapsible-inner">
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5">Attribute</th>
                      <th className="text-right px-2 py-1.5">Value</th>
                      <th className="text-right px-2 py-1.5">Raw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disk.attributes.map((attr) => (
                      <tr
                        key={attr.id}
                        className={`border-t border-slate-100 dark:border-slate-700/60 ${
                          attr.status === "critical"
                            ? "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
                            : attr.status === "warning"
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <td className="px-2 py-1.5 font-semibold">{attr.name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{attr.value}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{attr.raw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DiskHealthPanel: React.FC = () => {
  const [report, setReport] = useState<DiskHealthReport | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = () => {
    setError(null);
    bridge
      .getDiskHealth()
      .then((res) => {
        setReport(res);
        const unhealthy = res.disks.filter(
          (d) => d.available && (d.overall_status === "warning" || d.overall_status === "critical")
        );
        if (unhealthy.length > 0) {
          const worst = unhealthy.find((d) => d.overall_status === "critical") ?? unhealthy[0];
          notify(
            "diskHealth",
            `Drive health ${worst.overall_status === "critical" ? "critical" : "warning"}`,
            `${worst.model} is reporting early signs of trouble. Back up anything important soon.`
          );
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  };

  useEffect(() => {
    loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const res = await bridge.getDiskHealthElevated();
      setReport(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRechecking(false);
    }
  };

  if (error) {
    return (
      <div className="pt-2">
        <ErrorBanner
          title="Drive Health Unavailable"
          message={error}
          onDismiss={() => setError(null)}
          onRetry={loadHealth}
        />
      </div>
    );
  }
  if (!report) return null;
  if (!report.smartctl_installed) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        Install <span className="font-mono">smartmontools</span> to see drive health data here
        (<span className="font-mono">sudo dnf install smartmontools</span> on Fedora, or download
        smartmontools for Windows).
      </div>
    );
  }
  if (report.disks.length === 0) return null;

  return (
    <div className="text-left pt-2 space-y-3">
      <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Drive Health (SMART)</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {report.disks.map((disk) => (
          <DiskCard key={disk.device} disk={disk} onRecheck={handleRecheck} rechecking={rechecking} />
        ))}
      </div>
    </div>
  );
};
