// Evidence engine domain models.
// Deterministic, explainable. No machine learning, no LLM involvement.

export type Observation =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "TEMPORARILY_BLOCKED"
  | "SERVICE_PROVIDED";

export type EvidenceSource =
  | "FACILITY_STAFF"
  | "REFERRAL_OUTCOME"
  | "DISTRICT_SUPERVISOR"
  | "OFFLINE_SYNC"
  | "DEMO_SEED";

export interface EvidenceEvent {
  id: string;
  facility_id: string;
  service_id: string;
  observation: Observation;
  observed_at: string; // ISO timestamp
  source: EvidenceSource;
  is_duplicate?: boolean | null;
  notes?: string | null;
}

export type FreshnessBand = "VERY_FRESH" | "FRESH" | "AGING" | "STALE";

export interface FreshnessThresholds {
  /** minutes */
  very_fresh_min: number;
  fresh_min: number;
  aging_min: number;
}

export const DEFAULT_THRESHOLDS: FreshnessThresholds = {
  very_fresh_min: 30,
  fresh_min: 120,
  aging_min: 720,
};

export interface EriBreakdown {
  /** Directional support: how strongly weighted evidence points one way. 0..1 */
  S: number;
  /** Sufficiency: penalises relying on a single observation. 0..1 */
  Q: number;
  /** Consistency: reduced by overlapping conflicting reports. 0..1 */
  C: number;
  /** Candidate Evidence Reliability Index = S x Q x C */
  eri: number;
  positiveWeight: number;
  negativeWeight: number;
  totalWeight: number;
  usedCount: number;
  duplicateCount: number;
  conflictCount: number;
  conflictLoad: number;
  latestObservation: Observation | null;
  latestObservedAt: string | null;
  ageMinutes: number | null;
  freshness: FreshnessBand | "NONE";
  direction: "POSITIVE" | "NEGATIVE" | "NONE";
  reasons: string[];
}

/** Positive = evidence that the service was working. */
export function polarity(observation: Observation): 1 | -1 {
  return observation === "AVAILABLE" || observation === "SERVICE_PROVIDED" ? 1 : -1;
}

export const OBSERVATION_LABEL: Record<Observation, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  TEMPORARILY_BLOCKED: "Temporarily blocked",
  SERVICE_PROVIDED: "Service provided",
};
