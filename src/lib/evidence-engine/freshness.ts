import {
  DEFAULT_THRESHOLDS,
  type FreshnessBand,
  type FreshnessThresholds,
} from "./models";

export function ageMinutes(observedAt: string | Date, now: Date = new Date()): number {
  const t = observedAt instanceof Date ? observedAt : new Date(observedAt);
  return Math.max(0, (now.getTime() - t.getTime()) / 60000);
}

export function freshnessBand(
  minutes: number,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): FreshnessBand {
  if (minutes <= thresholds.very_fresh_min) return "VERY_FRESH";
  if (minutes <= thresholds.fresh_min) return "FRESH";
  if (minutes <= thresholds.aging_min) return "AGING";
  return "STALE";
}

export const FRESHNESS_LABEL: Record<FreshnessBand, string> = {
  VERY_FRESH: "Very fresh",
  FRESH: "Fresh",
  AGING: "Aging",
  STALE: "Stale",
};

/**
 * Exponential decay weight. Half-life equals the "fresh" threshold, so an
 * observation at the fresh boundary counts half as much as a brand new one.
 * Never returns 0 so that old evidence is retained but clearly down-weighted.
 */
export function freshnessWeight(
  minutes: number,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): number {
  const halfLife = Math.max(1, thresholds.fresh_min);
  return Math.pow(0.5, minutes / halfLife);
}

export function formatAge(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
