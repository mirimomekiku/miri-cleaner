import React, { useEffect, useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { PixelBadge } from "../ui/PixelBadge";
import { bridge } from "../../lib/bridge";
import { getStreak, StreakRecord } from "../../lib/streakTracker";
import { formatBytes } from "../../lib/formatters";
import { Flame } from "lucide-react";

interface Tier {
  min: number;
  label: string;
  blooms: number;
  stemHeight: number;
}

// Streak length -> garden growth stage. Deliberately coarse (six stages),
// each one a visibly different amount of bloom rather than a subtle size
// creep, so the card reads as "grown" at a glance.
const TIERS: Tier[] = [
  { min: 0, label: "Just getting started", blooms: 0, stemHeight: 10 },
  { min: 1, label: "A little sprout!", blooms: 1, stemHeight: 18 },
  { min: 3, label: "Budding nicely", blooms: 2, stemHeight: 26 },
  { min: 7, label: "In full bloom", blooms: 3, stemHeight: 34 },
  { min: 14, label: "Flourishing garden", blooms: 4, stemHeight: 40 },
  { min: 30, label: "Full bloom, legendary care!", blooms: 5, stemHeight: 46 },
];

function tierFor(streak: number): Tier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (streak >= tier.min) current = tier;
  }
  return current;
}

const BLOOM_COLORS = ["#FF9D9D", "#FFC800", "#58CC02", "#1CB0F6", "#FF7B7B"];

/** A small inline garden bed: stem count/height and bloom count scale with
 * the current tier. No external assets -- pure SVG using brand colors. */
const GardenBed: React.FC<{ tier: Tier }> = ({ tier }) => {
  const stemCount = Math.max(1, tier.blooms || 1);
  const width = 220;
  const height = 64;
  const groundY = height - 6;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[220px] h-16"
      aria-hidden="true"
    >
      {/* Ground */}
      <rect x="0" y={groundY} width={width} height="6" rx="3" fill="#E9DCC9" />

      {tier.blooms === 0 ? (
        // Bare soil with a single seed mound -- the "day zero" state.
        <circle cx={width / 2} cy={groundY - 4} r="4" fill="#C59B27" />
      ) : (
        Array.from({ length: stemCount }).map((_, i) => {
          const spacing = width / (stemCount + 1);
          const x = spacing * (i + 1);
          const sway = i % 2 === 0 ? -4 : 4;
          const color = BLOOM_COLORS[i % BLOOM_COLORS.length];
          return (
            <g
              key={i}
              className="animate-pop"
              style={{ transformOrigin: `${x}px ${groundY}px`, animationDelay: `${i * 60}ms` }}
            >
              <path
                d={`M ${x} ${groundY} Q ${x + sway} ${groundY - tier.stemHeight / 2} ${x} ${
                  groundY - tier.stemHeight
                }`}
                stroke="#58CC02"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={x} cy={groundY - tier.stemHeight} r="6" fill={color} />
              <circle cx={x} cy={groundY - tier.stemHeight} r="2.5" fill="#FFF9F8" />
            </g>
          );
        })
      )}
    </svg>
  );
};

interface Milestone {
  label: string;
  earned: boolean;
}

export const GardenGrowth: React.FC = () => {
  const scanResult = useCleanerStore((s) => s.scanResult);
  const [streak, setStreak] = useState<StreakRecord>(() => getStreak());
  const [totalFreedBytes, setTotalFreedBytes] = useState(0);

  // recordActivity() runs in App.tsx's scan effect; re-read once that scan
  // (and thus today's streak update) has landed, rather than only on mount.
  useEffect(() => {
    setStreak(getStreak());
  }, [scanResult]);

  useEffect(() => {
    let cancelled = false;
    bridge
      .getAuditHistory()
      .then((entries) => {
        if (cancelled) return;
        setTotalFreedBytes(entries.reduce((acc, e) => acc + e.freed_bytes, 0));
      })
      .catch(() => {
        // Milestone badges are a bonus, not core functionality; a failed
        // fetch just leaves the byte-based badges unearned for now.
      });
    return () => {
      cancelled = true;
    };
  }, [scanResult]);

  const tier = tierFor(streak.currentStreak);
  const totalGb = totalFreedBytes / (1024 * 1024 * 1024);

  const milestones: Milestone[] = [
    { label: "3-Day Streak", earned: streak.longestStreak >= 3 },
    { label: "7-Day Streak", earned: streak.longestStreak >= 7 },
    { label: "First GB Freed", earned: totalGb >= 1 },
    { label: "10 GB Freed", earned: totalGb >= 10 },
  ];

  return (
    <div className="animate-fade-in bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm flex flex-col sm:flex-row items-center gap-6">
      <div className="flex flex-col items-center shrink-0">
        <GardenBed tier={tier} />
        <p className="text-xs font-bold text-slate-600 mt-1 text-center max-w-[220px]">
          {tier.label}
        </p>
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            <Flame className={`w-5 h-5 ${streak.currentStreak > 0 ? "text-amber-500" : "text-slate-300"}`} />
            <div>
              <div className="text-lg font-black text-slate-900 leading-tight tabular-nums">
                {streak.currentStreak} {streak.currentStreak === 1 ? "day" : "days"}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Streak
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-lg font-black text-slate-700 leading-tight tabular-nums">
              {streak.longestStreak} {streak.longestStreak === 1 ? "day" : "days"}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Longest Streak
            </div>
          </div>
          {totalFreedBytes > 0 && (
            <>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-lg font-black text-slate-700 leading-tight tabular-nums">
                  {formatBytes(totalFreedBytes).formatted}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Freed All-Time
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {milestones.map((m) => (
            <div key={m.label} className={m.earned ? "animate-pop" : "opacity-40 grayscale"}>
              <PixelBadge label={m.label} variant={m.earned ? "green" : "gray"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
