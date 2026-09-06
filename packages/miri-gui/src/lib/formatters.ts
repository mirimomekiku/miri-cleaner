/**
 * Resilient internationalization and byte formatting utilities.
 * Handles extreme scales (0 B to Petabytes), negative numbers, and localized separators.
 */

export interface FormattedBytes {
  value: string;
  unit: string;
  formatted: string;
}

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number, locale = "en-US"): FormattedBytes {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { value: "0", unit: "B", formatted: "0 B" };
  }

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1
  );

  const unit = UNITS[i];
  const rawValue = bytes / Math.pow(1024, i);

  // Precision rules:
  // Bytes: 0 decimals
  // KB: 0 decimals if >= 100KB, else 1
  // MB: 1 decimal
  // GB: 2 decimals if < 10, else 1
  // TB/PB: 2 decimals
  let maxDecimals = 1;
  if (i === 0) maxDecimals = 0;
  else if (i === 1 && rawValue >= 100) maxDecimals = 0;
  else if (i === 3 && rawValue < 10) maxDecimals = 2;
  else if (i >= 4) maxDecimals = 2;

  const formattedVal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(rawValue);

  return {
    value: formattedVal,
    unit,
    formatted: `${formattedVal} ${unit}`,
  };
}

export function formatNumber(count: number, locale = "en-US"): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  return new Intl.NumberFormat(locale).format(Math.floor(count));
}

/**
 * Calculates honest system health score (0-100) based on detected disk clutter.
 * A system with less than 200MB clutter is 100% sparkling clean.
 */
export function calculateHealthScore(totalClutterBytes: number): number {
  if (!Number.isFinite(totalClutterBytes) || totalClutterBytes <= 200 * 1024 * 1024) {
    return 100;
  }
  const clutterGB = totalClutterBytes / (1024 * 1024 * 1024);
  // Score falls gracefully: -5 points per GB of clutter, floor at 30%
  return Math.max(30, Math.min(99, Math.round(100 - clutterGB * 5)));
}
