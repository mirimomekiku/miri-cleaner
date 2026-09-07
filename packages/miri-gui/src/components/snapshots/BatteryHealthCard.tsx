import React from "react";
import { Battery, BatteryCharging, TrendingDown, TrendingUp } from "lucide-react";
import { PixelBadge } from "../ui/PixelBadge";
import { BatterySample } from "../../lib/batteryHistory";
import { BatteryVitals } from "../../types";

interface BatteryHealthCardProps {
  battery: BatteryVitals;
  history: BatterySample[];
}

/** Compact inline-SVG sparkline -- no charting dependency, matching how the
 * rest of this app avoids adding chart libraries for small trend visuals.
 * Stroke color follows the trend direction (mint holding/improving, amber
 * declining) so the line agrees with the delta badge next to it. */
const HealthSparkline: React.FC<{ samples: BatterySample[]; color: string }> = ({ samples, color }) => {
  const width = 240;
  const height = 56;
  const padding = 6;

  const values = samples.map((s) => s.healthPercentage);
  const min = Math.min(...values, 100);
  const max = Math.max(...values, min + 1);
  const span = max - min || 1;

  const points = samples.map((s, i) => {
    const x =
      samples.length === 1
        ? width / 2
        : padding + (i / (samples.length - 1)) * (width - padding * 2);
    const y = height - padding - ((s.healthPercentage - min) / span) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14" preserveAspectRatio="none" aria-hidden="true">
      <path d={areaPath} fill={color} opacity="0.12" />
      <path
        d={path}
        pathLength={1}
        className="animate-draw-path"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 1.5} fill={color} />
      ))}
    </svg>
  );
};

export const BatteryHealthCard: React.FC<BatteryHealthCardProps> = ({ battery, history }) => {
  const isCharging = battery.status.toLowerCase().includes("charg") && !battery.status.toLowerCase().includes("dis");
  const health = battery.health_percentage;
  const trendDelta =
    history.length >= 2 ? history[history.length - 1].healthPercentage - history[0].healthPercentage : 0;

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            {isCharging ? <BatteryCharging className="w-5 h-5" /> : <Battery className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900">Battery Health</h4>
              <PixelBadge label={battery.status} variant="green" />
            </div>
            <p className="text-xs text-slate-500">
              {battery.percentage}% charged
              {battery.cycle_count != null ? ` · ${battery.cycle_count} charge cycles` : ""}
            </p>
          </div>
        </div>

        {health != null && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-slate-900">{health}%</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Design Capacity
            </div>
          </div>
        )}
      </div>

      {history.length < 3 ? (
        <div className="text-center py-5 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
          Still collecting data -- check back after a few more days of use to see a health trend.
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500">
              Health trend ({history.length} {history.length === 1 ? "day" : "days"} tracked)
            </span>
            {trendDelta !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                  trendDelta < 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {trendDelta < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {trendDelta > 0 ? "+" : ""}
                {trendDelta.toFixed(1)}%
              </span>
            )}
          </div>
          <HealthSparkline samples={history} color={trendDelta < 0 ? "#B45309" : "#58CC02"} />
        </div>
      )}
    </div>
  );
};
