import { describe, expect, it } from "vitest";
import { computeEri, SUFFICIENCY_K } from "../scoring";
import { detectConflicts, isDuplicateOf } from "../conflict";
import { ageMinutes, freshnessBand, freshnessWeight } from "../freshness";
import { haversineKm, rankCandidates } from "../ranking";
import type { EvidenceEvent, Observation } from "../models";
import { runSimulation } from "../../validation/simulator";

const NOW = new Date("2026-01-01T12:00:00.000Z");

function ev(minutesAgo: number, observation: Observation, extra: Partial<EvidenceEvent> = {}): EvidenceEvent {
  return {
    id: `${observation}-${minutesAgo}-${Math.random()}`,
    facility_id: "F1",
    service_id: "S1",
    observation,
    observed_at: new Date(NOW.getTime() - minutesAgo * 60000).toISOString(),
    source: "FACILITY_STAFF",
    is_duplicate: false,
    ...extra,
  };
}

describe("freshness", () => {
  it("bands evidence by age", () => {
    expect(freshnessBand(10)).toBe("VERY_FRESH");
    expect(freshnessBand(90)).toBe("FRESH");
    expect(freshnessBand(300)).toBe("AGING");
    expect(freshnessBand(2000)).toBe("STALE");
  });

  it("decays weight with age and never treats old as new", () => {
    expect(freshnessWeight(0)).toBe(1);
    expect(freshnessWeight(120)).toBeCloseTo(0.5, 5);
    expect(freshnessWeight(600)).toBeLessThan(freshnessWeight(60));
  });

  it("computes age in minutes", () => {
    expect(Math.round(ageMinutes(new Date(NOW.getTime() - 3600000), NOW))).toBe(60);
  });
});

describe("ERI = S x Q x C", () => {
  it("returns zero with an explanation when there is no evidence", () => {
    const b = computeEri([], NOW);
    expect(b.eri).toBe(0);
    expect(b.reasons[0]).toContain("No recent evidence");
  });

  it("penalises a single observation through sufficiency", () => {
    const one = computeEri([ev(5, "AVAILABLE")], NOW);
    const many = computeEri([ev(5, "AVAILABLE"), ev(20, "AVAILABLE"), ev(40, "AVAILABLE")], NOW);
    expect(one.S).toBeCloseTo(1, 5);
    expect(one.Q).toBeLessThan(many.Q);
    expect(one.eri).toBeLessThan(many.eri);
    expect(one.Q).toBeCloseTo(1 / (1 + SUFFICIENCY_K), 1);
  });

  it("lowers directional support when evidence points the other way", () => {
    const neg = computeEri([ev(5, "UNAVAILABLE"), ev(15, "UNAVAILABLE")], NOW);
    expect(neg.S).toBeLessThan(0.2);
    expect(neg.direction).toBe("NEGATIVE");
  });

  it("lowers consistency when overlapping reports conflict", () => {
    const clean = computeEri([ev(10, "AVAILABLE"), ev(30, "AVAILABLE"), ev(50, "AVAILABLE")], NOW);
    const conflicted = computeEri([ev(10, "AVAILABLE"), ev(30, "UNAVAILABLE"), ev(50, "AVAILABLE")], NOW);
    expect(conflicted.C).toBeLessThan(clean.C);
    expect(conflicted.conflictCount).toBeGreaterThan(0);
    expect(conflicted.eri).toBeLessThan(clean.eri);
  });

  it("ignores duplicates so they cannot inflate confidence", () => {
    const base = computeEri([ev(10, "AVAILABLE"), ev(20, "AVAILABLE")], NOW);
    const withDupes = computeEri(
      [ev(10, "AVAILABLE"), ev(20, "AVAILABLE"), ev(11, "AVAILABLE", { is_duplicate: true })],
      NOW,
    );
    expect(withDupes.eri).toBe(base.eri);
    expect(withDupes.duplicateCount).toBe(1);
  });

  it("weights fresh evidence above stale evidence", () => {
    const fresh = computeEri([ev(5, "AVAILABLE"), ev(10, "AVAILABLE")], NOW);
    const stale = computeEri([ev(3000, "AVAILABLE"), ev(3100, "AVAILABLE")], NOW);
    expect(fresh.eri).toBeGreaterThan(stale.eri);
    expect(stale.freshness).toBe("STALE");
  });
});

describe("conflict and duplicate detection", () => {
  it("detects overlapping disagreement", () => {
    const pairs = detectConflicts([ev(10, "AVAILABLE"), ev(35, "UNAVAILABLE")], NOW);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.gapMinutes).toBeCloseTo(25, 1);
  });

  it("does not flag disagreement far outside the overlap window", () => {
    expect(detectConflicts([ev(10, "AVAILABLE"), ev(600, "UNAVAILABLE")], NOW)).toHaveLength(0);
  });

  it("finds duplicate reports from the same source within the window", () => {
    const existing = [{ ...ev(10, "AVAILABLE"), source: "FACILITY_STAFF", created_by: "u1" }];
    const candidate = { ...ev(13, "AVAILABLE"), source: "FACILITY_STAFF", created_by: "u1" };
    expect(isDuplicateOf(candidate, existing)).toBe(existing[0]!.id);
    expect(isDuplicateOf({ ...candidate, created_by: "u2" }, existing)).toBeNull();
  });
});

describe("distance and ranking", () => {
  it("computes great-circle distance", () => {
    expect(haversineKm(23.25, 77.4, 23.35, 77.4)).toBeCloseTo(11.1, 0);
  });

  it("removes ineligible and blocked facilities and explains the order", () => {
    const origin = { latitude: 23.25, longitude: 77.4 };
    const fac = (id: string, lat: number) => ({
      id,
      code: id,
      name: id,
      type: "CHC",
      district: "D",
      latitude: lat,
      longitude: 77.4,
      is_active: true,
    });
    const { ranked, excluded } = rankCandidates(
      origin,
      [
        {
          facility: fac("strong", 23.33),
          registered: true,
          blocked: false,
          events: [ev(10, "AVAILABLE"), ev(40, "AVAILABLE"), ev(80, "SERVICE_PROVIDED")],
        },
        {
          facility: fac("conflicted", 23.28),
          registered: true,
          blocked: false,
          events: [ev(15, "AVAILABLE"), ev(35, "UNAVAILABLE")],
        },
        { facility: fac("blocked", 23.26), registered: true, blocked: true, events: [ev(5, "AVAILABLE")] },
        { facility: fac("unregistered", 23.26), registered: false, blocked: false, events: [] },
      ],
      { now: NOW },
    );
    expect(ranked[0]!.facility.id).toBe("strong");
    expect(ranked.map((r) => r.facility.id)).not.toContain("blocked");
    expect(excluded).toHaveLength(2);
    expect(ranked[0]!.why.length).toBeGreaterThan(2);
  });
});

describe("feedback loop", () => {
  it("raises ERI after positive outcomes and lowers it after failures", () => {
    const before = computeEri([ev(30, "AVAILABLE"), ev(200, "UNAVAILABLE")], NOW);
    const afterGood = computeEri(
      [ev(5, "SERVICE_PROVIDED"), ev(20, "SERVICE_PROVIDED"), ev(30, "AVAILABLE"), ev(200, "UNAVAILABLE")],
      NOW,
    );
    const afterBad = computeEri(
      [ev(5, "UNAVAILABLE"), ev(20, "UNAVAILABLE"), ev(30, "AVAILABLE"), ev(200, "UNAVAILABLE")],
      NOW,
    );
    expect(afterGood.eri).toBeGreaterThan(before.eri);
    expect(afterBad.eri).toBeLessThan(before.eri);
  });
});

describe("validation simulation", () => {
  it("is reproducible for a given seed", () => {
    const a = runSimulation({ scenario: "normal", seeds: [1, 2, 3], runsPerSeed: 2 });
    const b = runSimulation({ scenario: "normal", seeds: [1, 2, 3], runsPerSeed: 2 });
    expect(a.results).toEqual(b.results);
    expect(a.totalRuns).toBe(6);
  });

  it("runs 30+ seeds and reports every method", () => {
    const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
    const out = runSimulation({ scenario: "conflicting_reports", seeds, runsPerSeed: 1 });
    expect(out.results).toHaveLength(8);
    for (const r of out.results) {
      expect(r.top1Success).toBeGreaterThanOrEqual(0);
      expect(r.top1Success).toBeLessThanOrEqual(1);
      expect(r.top3Success).toBeGreaterThanOrEqual(r.top1Success - 1e-9);
    }
  });
});
