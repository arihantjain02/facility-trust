/**
 * Independent validation pipeline (simulation only).
 *
 * Hidden world -> noisy observation layer -> referral decision -> ground truth
 * -> evaluation. Every method sees exactly the same observations. Results are
 * SIMULATED and must never be presented as real-world healthcare outcomes.
 */
import { computeEri } from "../evidence-engine/scoring";
import { haversineKm } from "../evidence-engine/ranking";
import { ageMinutes, freshnessWeight } from "../evidence-engine/freshness";
import { polarity, type EvidenceEvent, type Observation } from "../evidence-engine/models";

export type ScenarioId =
  | "normal"
  | "stale_information"
  | "sudden_failure"
  | "rapid_switching"
  | "conflicting_reports"
  | "missing_reports"
  | "delayed_reports"
  | "cold_start"
  | "poor_connectivity"
  | "reporting_bias"
  | "adversarial_observations";

export const SCENARIOS: Array<{ id: ScenarioId; label: string; description: string }> = [
  { id: "normal", label: "Normal", description: "Steady state, reasonable reporting rate." },
  { id: "stale_information", label: "Stale information", description: "Reports arrive rarely, so evidence ages badly." },
  { id: "sudden_failure", label: "Sudden service failure", description: "Equipment fails without warning mid-window." },
  { id: "rapid_switching", label: "Rapid switching", description: "Service state flips frequently." },
  { id: "conflicting_reports", label: "Conflicting reports", description: "High observation noise creates disagreement." },
  { id: "missing_reports", label: "Missing reports", description: "Many facilities report nothing at all." },
  { id: "delayed_reports", label: "Delayed reports", description: "Reports are timestamped late." },
  { id: "cold_start", label: "Cold start", description: "Almost no history exists yet." },
  { id: "poor_connectivity", label: "Poor connectivity", description: "Reports are dropped or synced late." },
  { id: "reporting_bias", label: "Reporting bias", description: "Staff over-report availability." },
  { id: "adversarial_observations", label: "Adversarial observations", description: "A facility systematically reports availability when down." },
];

export type MethodId =
  | "nearest"
  | "static_distance"
  | "freshest_positive"
  | "recent_majority"
  | "reli_ref_s"
  | "reli_ref_sq"
  | "reli_ref_sc"
  | "reli_ref_sqc";

export const METHODS: Array<{ id: MethodId; label: string; family: "baseline" | "reli-ref" }> = [
  { id: "nearest", label: "Nearest eligible facility", family: "baseline" },
  { id: "static_distance", label: "Static capability + distance", family: "baseline" },
  { id: "freshest_positive", label: "Freshest positive + distance", family: "baseline" },
  { id: "recent_majority", label: "Recent majority + distance", family: "baseline" },
  { id: "reli_ref_s", label: "RELI-REF S only", family: "reli-ref" },
  { id: "reli_ref_sq", label: "RELI-REF S x Q", family: "reli-ref" },
  { id: "reli_ref_sc", label: "RELI-REF S x C", family: "reli-ref" },
  { id: "reli_ref_sqc", label: "RELI-REF S x Q x C (candidate)", family: "reli-ref" },
];

export interface ScenarioParams {
  facilities: number;
  ticksMinutes: number;
  historyHours: number;
  reportRate: number; // probability a facility reports per hour
  noise: number; // probability a report is wrong
  switchRate: number; // probability the hidden state flips per hour
  dropRate: number; // probability a produced report never lands
  delayMinutes: number;
  positiveBias: number; // extra chance of reporting "available"
  adversarialFacilities: number;
}

const BASE: ScenarioParams = {
  facilities: 8,
  ticksMinutes: 30,
  historyHours: 24,
  reportRate: 0.6,
  noise: 0.08,
  switchRate: 0.08,
  dropRate: 0.05,
  delayMinutes: 0,
  positiveBias: 0,
  adversarialFacilities: 0,
};

export function scenarioParams(id: ScenarioId): ScenarioParams {
  switch (id) {
    case "stale_information":
      return { ...BASE, reportRate: 0.08 };
    case "sudden_failure":
      return { ...BASE, switchRate: 0.02, reportRate: 0.4 };
    case "rapid_switching":
      return { ...BASE, switchRate: 0.45 };
    case "conflicting_reports":
      return { ...BASE, noise: 0.3, reportRate: 0.9 };
    case "missing_reports":
      return { ...BASE, reportRate: 0.15, dropRate: 0.4 };
    case "delayed_reports":
      return { ...BASE, delayMinutes: 180 };
    case "cold_start":
      return { ...BASE, historyHours: 2, reportRate: 0.2 };
    case "poor_connectivity":
      return { ...BASE, dropRate: 0.45, delayMinutes: 90 };
    case "reporting_bias":
      return { ...BASE, positiveBias: 0.35 };
    case "adversarial_observations":
      return { ...BASE, adversarialFacilities: 2, noise: 0.1 };
    default:
      return BASE;
  }
}

/** Deterministic PRNG (mulberry32) so every seed is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimFacility {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  available: boolean;
  adversarial: boolean;
}

export interface MethodResult {
  method: MethodId;
  label: string;
  family: "baseline" | "reli-ref";
  runs: number;
  top1Success: number;
  top3Success: number;
  failureRate: number;
  staleSelections: number;
  avgDistanceKm: number;
}

export interface SimulationOutput {
  scenario: ScenarioId;
  seeds: number[];
  runsPerSeed: number;
  totalRuns: number;
  results: MethodResult[];
  simulated: true;
  generatedAt: string;
}

export function runSimulation(input: {
  scenario: ScenarioId;
  seeds: number[];
  runsPerSeed: number;
  methods?: MethodId[];
}): SimulationOutput {
  const params = scenarioParams(input.scenario);
  const methods = (input.methods?.length ? input.methods : METHODS.map((m) => m.id)) as MethodId[];
  const tally: Record<string, { top1: number; top3: number; stale: number; dist: number; n: number }> =
    {};
  for (const m of methods) tally[m] = { top1: 0, top3: 0, stale: 0, dist: 0, n: 0 };

  const now = new Date("2026-01-01T12:00:00.000Z");

  for (const seed of input.seeds) {
    for (let run = 0; run < input.runsPerSeed; run++) {
      const rand = rng(seed * 7919 + run * 104729 + 17);
      const { facilities, events, origin } = buildWorld(params, rand, now, input.scenario);

      for (const m of methods) {
        const ordered = decide(m, facilities, events, origin, now);
        if (ordered.length === 0) continue;
        const first = ordered[0]!;
        const truth = facilities.find((f) => f.id === first.id)!;
        const t = tally[m]!;
        t.n += 1;
        if (truth.available) t.top1 += 1;
        if (ordered.slice(0, 3).some((c) => facilities.find((f) => f.id === c.id)!.available))
          t.top3 += 1;
        const facEvents = events.filter((e) => e.facility_id === first.id);
        const latest = facEvents.sort(
          (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime(),
        )[0];
        if (!latest || ageMinutes(latest.observed_at, now) > 720) t.stale += 1;
        t.dist += haversineKm(origin.latitude, origin.longitude, truth.latitude, truth.longitude);
      }
    }
  }

  const results: MethodResult[] = methods.map((m) => {
    const t = tally[m]!;
    const n = Math.max(1, t.n);
    const meta = METHODS.find((x) => x.id === m)!;
    return {
      method: m,
      label: meta.label,
      family: meta.family,
      runs: t.n,
      top1Success: round3(t.top1 / n),
      top3Success: round3(t.top3 / n),
      failureRate: round3(1 - t.top1 / n),
      staleSelections: round3(t.stale / n),
      avgDistanceKm: round3(t.dist / n),
    };
  });

  return {
    scenario: input.scenario,
    seeds: input.seeds,
    runsPerSeed: input.runsPerSeed,
    totalRuns: input.seeds.length * input.runsPerSeed,
    results,
    simulated: true,
    generatedAt: new Date().toISOString(),
  };
}

function buildWorld(
  params: ScenarioParams,
  rand: () => number,
  now: Date,
  scenario: ScenarioId,
): { facilities: SimFacility[]; events: EvidenceEvent[]; origin: { latitude: number; longitude: number } } {
  const origin = { latitude: 23.25, longitude: 77.4 };
  const facilities: SimFacility[] = [];
  for (let i = 0; i < params.facilities; i++) {
    facilities.push({
      id: `F${i}`,
      name: `Facility ${i + 1}`,
      latitude: origin.latitude + (rand() - 0.5) * 0.6,
      longitude: origin.longitude + (rand() - 0.5) * 0.6,
      available: rand() < 0.55,
      adversarial: i < params.adversarialFacilities,
    });
  }

  const events: EvidenceEvent[] = [];
  const totalTicks = Math.floor((params.historyHours * 60) / params.ticksMinutes);
  const perTick = params.ticksMinutes / 60;

  for (let tick = totalTicks; tick >= 0; tick--) {
    const minutesAgo = tick * params.ticksMinutes;
    for (const f of facilities) {
      // hidden world evolves
      if (rand() < params.switchRate * perTick) f.available = !f.available;
      if (scenario === "sudden_failure" && tick === Math.floor(totalTicks * 0.15)) {
        if (rand() < 0.5) f.available = false;
      }
      // noisy observation layer
      if (rand() > params.reportRate * perTick) continue;
      if (rand() < params.dropRate) continue;
      let reported = f.available;
      if (rand() < params.noise) reported = !reported;
      if (!reported && rand() < params.positiveBias) reported = true;
      if (f.adversarial) reported = true;
      const observedAt = new Date(
        now.getTime() - minutesAgo * 60000 - (rand() < 0.5 ? params.delayMinutes : 0) * 60000,
      );
      const observation: Observation = reported
        ? rand() < 0.25
          ? "SERVICE_PROVIDED"
          : "AVAILABLE"
        : rand() < 0.3
          ? "TEMPORARILY_BLOCKED"
          : "UNAVAILABLE";
      events.push({
        id: `${f.id}-${tick}-${events.length}`,
        facility_id: f.id,
        service_id: "S",
        observation,
        observed_at: observedAt.toISOString(),
        source: "FACILITY_STAFF",
        is_duplicate: false,
      });
    }
  }
  return { facilities, events, origin };
}

function decide(
  method: MethodId,
  facilities: SimFacility[],
  events: EvidenceEvent[],
  origin: { latitude: number; longitude: number },
  now: Date,
): Array<{ id: string; score: number }> {
  const distance = (f: SimFacility) =>
    haversineKm(origin.latitude, origin.longitude, f.latitude, f.longitude);
  const proximity = (f: SimFacility) => Math.max(0, 1 - Math.min(distance(f) / 40, 1));

  return facilities
    .map((f) => {
      const own = events.filter((e) => e.facility_id === f.id);
      let score: number;
      switch (method) {
        case "nearest":
          score = proximity(f);
          break;
        case "static_distance":
          score = 0.5 + 0.5 * proximity(f);
          break;
        case "freshest_positive": {
          const latest = own
            .slice()
            .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())[0];
          const positive = latest ? polarity(latest.observation) === 1 : false;
          score = (positive ? 0.7 : 0) + 0.3 * proximity(f);
          break;
        }
        case "recent_majority": {
          const recent = own.filter((e) => ageMinutes(e.observed_at, now) <= 360);
          const pos = recent.filter((e) => polarity(e.observation) === 1).length;
          const share = recent.length ? pos / recent.length : 0.5;
          score = 0.7 * share + 0.3 * proximity(f);
          break;
        }
        default: {
          const b = computeEri(own, now);
          const value =
            method === "reli_ref_s"
              ? weightedSupport(own, now)
              : method === "reli_ref_sq"
                ? b.S * b.Q
                : method === "reli_ref_sc"
                  ? b.S * b.C
                  : b.eri;
          score = 0.7 * value + 0.3 * proximity(f);
        }
      }
      return { id: f.id, score };
    })
    .sort((a, b) => b.score - a.score);
}

function weightedSupport(events: EvidenceEvent[], now: Date): number {
  let pos = 0;
  let total = 0;
  for (const e of events) {
    const w = freshnessWeight(ageMinutes(e.observed_at, now));
    total += w;
    if (polarity(e.observation) === 1) pos += w;
  }
  return total === 0 ? 0 : pos / total;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
