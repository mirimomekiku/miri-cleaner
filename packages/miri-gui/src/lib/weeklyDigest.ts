import { AuditEntry } from "../types";

export interface WeeklyDigest {
  freedBytes: number;
  operationCount: number;
  snapshotCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Clamps a byte amount to a safe non-negative finite number. A single
 * malformed audit entry (e.g. a corrupted native-side write) shouldn't be
 * able to poison the whole weekly total into NaN or a negative figure. */
function safeBytes(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Summarizes audit entries from the last 7 days. Pure function -- no I/O. */
export function computeWeeklyDigest(entries: AuditEntry[], now: Date = new Date()): WeeklyDigest {
  const nowMs = now.getTime();
  if (!Array.isArray(entries) || !Number.isFinite(nowMs)) {
    return { freedBytes: 0, operationCount: 0, snapshotCount: 0 };
  }

  const cutoff = nowMs - SEVEN_DAYS_MS;
  const recent = entries.filter((e) => {
    const t = new Date(e?.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });

  return {
    freedBytes: recent.reduce((acc, e) => acc + safeBytes(e.freed_bytes), 0),
    operationCount: recent.length,
    snapshotCount: recent.filter((e) => e.snapshot_id !== null && e.snapshot_id !== undefined).length,
  };
}

const DIGEST_SHOWN_KEY = "miri-cleaner:digest-last-shown";

/** ISO 8601 week identifier (e.g. "2026-W37"), so "once per week" survives
 * across month/year boundaries without drifting. */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function hasShownDigestThisWeek(now: Date = new Date()): boolean {
  try {
    return localStorage.getItem(DIGEST_SHOWN_KEY) === isoWeekKey(now);
  } catch {
    // If storage is unavailable, err toward not nagging every load.
    return true;
  }
}

export function markDigestShown(now: Date = new Date()): void {
  try {
    localStorage.setItem(DIGEST_SHOWN_KEY, isoWeekKey(now));
  } catch {
    // Nothing to persist to; the digest may reappear next launch.
  }
}
