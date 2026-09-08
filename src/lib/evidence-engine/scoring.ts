import { ageMinutes, freshnessBand, freshnessWeight, formatAge } from "./freshness";
import { detectConflicts } from "./conflict";
import {
  DEFAULT_THRESHOLDS,
  OBSERVATION_LABEL,
  polarity,
  type EriBreakdown,
  type EvidenceEvent,
  type FreshnessThresholds,
} from "./models";

/** Sufficiency saturation constant: weighted evidence mass needed for confidence. */
export const SUFFICIENCY_K = 1.5;

export function emptyBreakdown(): EriBreakdown {
  return {
    S: 0,
    Q: 0,
    C: 1,
    eri: 0,
    positiveWeight: 0,
    negativeWeight: 0,
    totalWeight: 0,
    usedCount: 0,
    duplicateCount: 0,
    conflictCount: 0,
    conflictLoad: 0,
    latestObservation: null,
    latestObservedAt: null,
    ageMinutes: null,
    freshness: "NONE",
    direction: "NONE",
    reasons: [
      "No recent evidence is available for this service. Registration alone is not treated as proof of availability.",
    ],
  };
}

/**
 * Candidate Evidence Reliability Index: ERI = S x Q x C.
 * Not scientifically validated — a candidate model under evaluation.
 */
export function computeEri(
  events: EvidenceEvent[],
  now: Date = new Date(),
  thresholds: FreshnessThresholds = DEFAULT_THRESHOLDS,
): EriBreakdown {
  const duplicateCount = events.filter((e) => e.is_duplicate).length;
  const used = events
    .filter((e) => !e.is_duplicate)
    .slice()
    .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());

  if (used.length === 0) {
    const empty = emptyBreakdown();
    empty.duplicateCount = duplicateCount;
    return empty;
  }

  let positiveWeight = 0;
  let negativeWeight = 0;
  for (const e of used) {
    const w = freshnessWeight(ageMinutes(e.observed_at, now), thresholds);
    if (polarity(e.observation) === 1) positiveWeight += w;
    else negativeWeight += w;
  }
  const totalWeight = positiveWeight + negativeWeight;

  // S — directional support toward "service is working".
  const S = totalWeight === 0 ? 0 : positiveWeight / totalWeight;

  // Q — sufficiency: one thin observation should not look highly reliable.
  const Q = totalWeight / (totalWeight + SUFFICIENCY_K);

  // C — consistency: overlapping disagreements reduce trust.
  const conflicts = detectConflicts(used, now, undefined, thresholds);
  const conflictLoad = conflicts.reduce((sum, c) => sum + c.load, 0);
  const C = 1 / (1 + 2 * conflictLoad);

  const eri = round4(S * Q * C);
  const latest = used[0]!;
  const age = ageMinutes(latest.observed_at, now);
  const band = freshnessBand(age, thresholds);

  const reasons: string[] = [];
  reasons.push(
    `Latest observation: ${OBSERVATION_LABEL[latest.observation]} (${formatAge(age)}, ${band
      .toLowerCase()
      .replace("_", " ")}).`,
  );
  reasons.push(
    S >= 0.7
      ? `Recent evidence mostly points to the service working (support ${S.toFixed(2)}).`
      : S <= 0.3
        ? `Recent evidence mostly points to the service not working (support ${S.toFixed(2)}).`
        : `Recent evidence is mixed (support ${S.toFixed(2)}).`,
  );
  reasons.push(
    used.length <= 1
      ? "Reliability limited because only one recent observation is available."
      : `Based on ${used.length} non-duplicate observations (sufficiency ${Q.toFixed(2)}).`,
  );
  if (conflicts.length > 0) {
    reasons.push(
      `${conflicts.length} overlapping report${conflicts.length > 1 ? "s" : ""} disagree, lowering consistency to ${C.toFixed(2)}.`,
    );
  } else {
    reasons.push("No overlapping conflicting reports detected.");
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} duplicate report(s) excluded so they cannot inflate confidence.`);
  }
  if (band === "STALE") {
    reasons.push("Most recent evidence is stale; treat this with caution.");
  }

  return {
    S: round4(S),
    Q: round4(Q),
    C: round4(C),
    eri,
    positiveWeight: round4(positiveWeight),
    negativeWeight: round4(negativeWeight),
    totalWeight: round4(totalWeight),
    usedCount: used.length,
    duplicateCount,
    conflictCount: conflicts.length,
    conflictLoad: round4(conflictLoad),
    latestObservation: latest.observation,
    latestObservedAt: latest.observed_at,
    ageMinutes: Math.round(age),
    freshness: band,
    direction: S >= 0.5 ? "POSITIVE" : "NEGATIVE",
    reasons,
  };
}

export function statusLabel(b: EriBreakdown): {
  label: string;
  tone: "ok" | "warn" | "bad" | "muted";
} {
  if (b.usedCount === 0) return { label: "No evidence", tone: "muted" };
  if (b.conflictCount > 0) return { label: "Conflicting", tone: "warn" };
  if (b.freshness === "STALE") return { label: "Stale evidence", tone: "warn" };
  if (b.direction === "NEGATIVE") return { label: "Likely unavailable", tone: "bad" };
  if (b.eri >= 0.5) return { label: "Likely available", tone: "ok" };
  return { label: "Weak evidence", tone: "warn" };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
