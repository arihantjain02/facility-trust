import { computeEri } from "./scoring";
import { DEFAULT_THRESHOLDS, type EriBreakdown, type EvidenceEvent, type FreshnessThresholds } from "./models";

export interface RankingWeights {
  eri: number;
  distance: number;
  distance_normalizer_km: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  eri: 0.7,
  distance: 0.3,
  distance_normalizer_km: 40,
};

export interface CandidateInput {
  facility: {
    id: string;
    code: string;
    name: string;
    type: string;
    district: string;
    latitude: number;
    longitude: number;
    is_active: boolean;
  };
  registered: boolean;
  blocked: boolean;
  blocked_reason?: string | null;
  events: EvidenceEvent[];
}

export interface RankedCandidate {
  facility: CandidateInput["facility"];
  eligible: boolean;
  excludedReason?: string;
  distanceKm: number;
  breakdown: EriBreakdown;
  score: number;
  rank: number;
  why: string[];
}

/** Great-circle distance in km. */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export function rankCandidates(
  origin: { latitude: number; longitude: number },
  candidates: CandidateInput[],
  options: {
    now?: Date;
    weights?: RankingWeights;
    thresholds?: FreshnessThresholds;
    maxDistanceKm?: number | null;
  } = {},
): { ranked: RankedCandidate[]; excluded: RankedCandidate[] } {
  const now = options.now ?? new Date();
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;

  const evaluated: RankedCandidate[] = candidates.map((c) => {
    const distanceKm = haversineKm(
      origin.latitude,
      origin.longitude,
      c.facility.latitude,
      c.facility.longitude,
    );
    const breakdown = computeEri(c.events, now, thresholds);

    // DECIDE — remove ineligible or currently blocked options.
    let excludedReason: string | undefined;
    if (!c.registered) excludedReason = "Not registered for the requested service";
    else if (!c.facility.is_active) excludedReason = "Facility is inactive";
    else if (c.blocked)
      excludedReason = `Service currently blocked${c.blocked_reason ? `: ${c.blocked_reason}` : ""}`;
    else if (options.maxDistanceKm != null && distanceKm > options.maxDistanceKm)
      excludedReason = `Beyond the preferred ${options.maxDistanceKm} km travel limit`;

    const proximity = Math.max(
      0,
      1 - Math.min(distanceKm / weights.distance_normalizer_km, 1),
    );
    const score =
      Math.round((weights.eri * breakdown.eri + weights.distance * proximity) * 10000) / 10000;

    const why: string[] = [];
    if (!excludedReason) why.push("Eligible for the requested service");
    why.push(...breakdown.reasons);
    why.push(`${distanceKm.toFixed(1)} km from the referring facility`);

    return {
      facility: c.facility,
      eligible: !excludedReason,
      excludedReason,
      distanceKm,
      breakdown,
      score,
      rank: 0,
      why,
    };
  });

  const ranked = evaluated
    .filter((c) => c.eligible)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const excluded = evaluated.filter((c) => !c.eligible);
  return { ranked, excluded };
}
