import { polarity, type EvidenceEvent } from "./models";
import { ageMinutes, freshnessWeight } from "./freshness";
import type { FreshnessThresholds } from "./models";
import { DEFAULT_THRESHOLDS } from "./models";

export interface ConflictPair {
  a: EvidenceEvent;
  b: EvidenceEvent;
  gapMinutes: number;
  /** How much this disagreement matters right now (0..1). */
  load: number;
}

/** Two reports conflict when they disagree in direction inside an overlap window. */
export const DEFAULT_CONFLICT_WINDOW_MIN = 90;

export function detectConflicts(
  events: EvidenceEvent[],
  now: Date = new Date(),
  windowMinutes: number = DEFAULT_CONFLICT_WINDOW_MIN,
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): ConflictPair[] {
  const usable = events.filter((e) => !e.is_duplicate);
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i]!;
      const b = usable[j]!;
      if (polarity(a.observation) === polarity(b.observation)) continue;
      const gap =
        Math.abs(new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()) / 60000;
      if (gap > windowMinutes) continue;
      const wa = freshnessWeight(ageMinutes(a.observed_at, now), thresholds);
      const wb = freshnessWeight(ageMinutes(b.observed_at, now), thresholds);
      pairs.push({ a, b, gapMinutes: gap, load: Math.min(wa, wb) });
    }
  }
  return pairs;
}

/** Same facility, service, observation and source within a short window. */
export const DEFAULT_DUPLICATE_WINDOW_MIN = 10;

export function isDuplicateOf(
  candidate: Pick<EvidenceEvent, "facility_id" | "service_id" | "observation" | "observed_at"> & {
    source: string;
    created_by?: string | null;
  },
  existing: Array<
    Pick<EvidenceEvent, "id" | "facility_id" | "service_id" | "observation" | "observed_at"> & {
      source: string;
      created_by?: string | null;
    }
  >,
  windowMinutes: number = DEFAULT_DUPLICATE_WINDOW_MIN,
): string | null {
  for (const e of existing) {
    if (e.facility_id !== candidate.facility_id) continue;
    if (e.service_id !== candidate.service_id) continue;
    if (e.observation !== candidate.observation) continue;
    if (e.source !== candidate.source) continue;
    if ((e.created_by ?? null) !== (candidate.created_by ?? null)) continue;
    const gap =
      Math.abs(new Date(e.observed_at).getTime() - new Date(candidate.observed_at).getTime()) /
      60000;
    if (gap <= windowMinutes) return e.id;
  }
  return null;
}
