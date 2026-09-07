/**
 * Cleaning streak tracker: a small localStorage record of consecutive days
 * the app has been actively used (scanned at least once). Purely a client-
 * side engagement signal -- no backend involvement.
 */

const STREAK_KEY = "miri-cleaner:streak";

export interface StreakRecord {
  /** YYYY-MM-DD of the last day activity was recorded, or "" if never. */
  lastActiveDate: string;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

const EMPTY_RECORD: StreakRecord = {
  lastActiveDate: "",
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
};

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return dateKey(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function getStreak(): StreakRecord {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { ...EMPTY_RECORD };
    const parsed = JSON.parse(raw) as Partial<StreakRecord>;
    return {
      lastActiveDate: typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : "",
      currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
      longestStreak: typeof parsed.longestStreak === "number" ? parsed.longestStreak : 0,
      totalActiveDays: typeof parsed.totalActiveDays === "number" ? parsed.totalActiveDays : 0,
    };
  } catch {
    // Storage can throw in locked-down webviews; treat as a fresh streak
    // rather than crash the app over a cosmetic engagement feature.
    return { ...EMPTY_RECORD };
  }
}

function saveStreak(record: StreakRecord): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(record));
  } catch {
    // Nothing to persist to; the streak just won't carry over this session.
  }
}

/**
 * Records today as an active day. No-ops if already recorded today.
 * Continues the streak if the last active day was yesterday, otherwise
 * resets it to 1. Call this once per app session (App.tsx does so after the
 * initial scan succeeds) -- not from every individual scan/clean handler.
 */
export function recordActivity(): StreakRecord {
  const record = getStreak();
  const today = todayKey();
  if (record.lastActiveDate === today) {
    return record;
  }
  const continuedStreak = record.lastActiveDate === yesterdayKey();
  const currentStreak = continuedStreak ? record.currentStreak + 1 : 1;
  const next: StreakRecord = {
    lastActiveDate: today,
    currentStreak,
    longestStreak: Math.max(record.longestStreak, currentStreak),
    totalActiveDays: record.totalActiveDays + 1,
  };
  saveStreak(next);
  return next;
}
