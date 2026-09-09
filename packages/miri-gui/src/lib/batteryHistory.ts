/**
 * Battery health trend: a small localStorage record of daily battery health
 * samples, so Safety & Vitals can show a trend instead of a single
 * point-in-time reading. Purely a client-side history -- no backend
 * involvement.
 */

const HISTORY_KEY = "miri-cleaner:battery-history";
const MAX_SAMPLES = 90;

export interface BatterySample {
  /** YYYY-MM-DD the sample was recorded. */
  date: string;
  healthPercentage: number;
  cycleCount: number | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getBatteryHistory(): BatterySample[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is BatterySample =>
        s && typeof s.date === "string" && typeof s.healthPercentage === "number"
    );
  } catch {
    // Storage can throw in locked-down webviews; treat as no history rather
    // than crash the app over a cosmetic trend feature.
    return [];
  }
}

function saveBatteryHistory(samples: BatterySample[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(samples));
  } catch {
    // Nothing to persist to; the trend just won't carry over this session.
  }
}

/**
 * Records today's battery health sample. No-ops (replaces in place) if a
 * sample for today already exists, so re-visiting Safety & Vitals within the
 * same day doesn't pollute the history. Retains at most MAX_SAMPLES most
 * recent days.
 */
export function recordBatterySample(healthPercentage: number, cycleCount: number | null): BatterySample[] {
  if (!Number.isFinite(healthPercentage)) return getBatteryHistory();

  const today = todayKey();
  const existing = getBatteryHistory().filter((s) => s.date !== today);
  const next = [...existing, { date: today, healthPercentage, cycleCount }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_SAMPLES);

  saveBatteryHistory(next);
  return next;
}
