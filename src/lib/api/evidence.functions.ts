import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRoles, loadSettings, writeAudit } from "./helpers";
import { computeEri } from "@/lib/evidence-engine/scoring";
import { detectConflicts, isDuplicateOf } from "@/lib/evidence-engine/conflict";
import type { EvidenceEvent } from "@/lib/evidence-engine/models";

/** GET /api/evidence — ledger with joined facility/service labels. */
export const listEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        facility_id: z.string().uuid().optional(),
        service_id: z.string().uuid().optional(),
        limit: z.number().min(1).max(1000).default(400),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("evidence_events")
      .select("*, facilities(name,code,type), services(name,code)")
      .order("observed_at", { ascending: false })
      .limit(data.limit);
    if (data.facility_id) q = q.eq("facility_id", data.facility_id);
    if (data.service_id) q = q.eq("service_id", data.service_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const { data: conflicts } = await supabase.from("evidence_conflicts").select("*");
    const conflicted = new Set<string>();
    for (const c of conflicts ?? []) {
      conflicted.add(c.evidence_a);
      conflicted.add(c.evidence_b);
    }
    const settings = await loadSettings(supabase);
    return {
      events: (rows ?? []).map((r: any) => ({ ...r, in_conflict: conflicted.has(r.id) })),
      thresholds: settings.thresholds,
    };
  });

export const listConflicts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("evidence_conflicts")
      .select("*, facilities(name,code), services(name,code)")
      .order("detected_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const submitSchema = z.object({
  facility_id: z.string().uuid(),
  service_id: z.string().uuid(),
  observation: z.enum(["AVAILABLE", "UNAVAILABLE", "TEMPORARILY_BLOCKED", "SERVICE_PROVIDED"]),
  observed_at: z.string().datetime().optional(),
  source: z
    .enum(["FACILITY_STAFF", "DISTRICT_SUPERVISOR", "OFFLINE_SYNC"])
    .default("FACILITY_STAFF"),
  notes: z.string().max(400).nullish().transform((v) => v ?? null),
  client_queued_at: z.string().datetime().optional(),
});

/**
 * POST /api/evidence — RECORD -> CHECK (duplicate + conflict) -> SUMMARISE (ERI).
 * Runs as one server-side sequence against PostgreSQL.
 */
export const submitEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const roles = await getRoles(supabase, userId);
    if (
      !roles.some((r) =>
        ["FACILITY_STAFF", "DISTRICT_SUPERVISOR", "REFERRAL_WORKER", "ADMIN"].includes(r),
      )
    ) {
      throw new Error("Your account does not have a role that can record service reports.");
    }

    const observedAt = data.observed_at ?? new Date().toISOString();
    const settings = await loadSettings(supabase);

    // existing evidence for this facility x service (last 24h) for duplicate + conflict checks
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("evidence_events")
      .select("*")
      .eq("facility_id", data.facility_id)
      .eq("service_id", data.service_id)
      .gte("observed_at", since)
      .order("observed_at", { ascending: false });

    const duplicateOf = isDuplicateOf(
      { ...data, observed_at: observedAt, created_by: userId },
      (existing ?? []).map((e: any) => ({ ...e, created_by: e.created_by })),
    );

    const { data: inserted, error } = await supabase
      .from("evidence_events")
      .insert({
        facility_id: data.facility_id,
        service_id: data.service_id,
        observation: data.observation,
        observed_at: observedAt,
        source: data.source,
        notes: data.notes,
        created_by: userId,
        is_duplicate: duplicateOf != null,
        duplicate_of: duplicateOf,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    // CHECK — conflict detection against overlapping reports
    const all: EvidenceEvent[] = [...(existing ?? []), inserted].filter(Boolean) as EvidenceEvent[];
    const pairs = detectConflicts(all, new Date(), undefined, settings.thresholds).filter(
      (p) => p.a.id === inserted!.id || p.b.id === inserted!.id,
    );
    for (const p of pairs) {
      await supabase.from("evidence_conflicts").insert({
        facility_id: data.facility_id,
        service_id: data.service_id,
        evidence_a: p.a.id,
        evidence_b: p.b.id,
        note: "Overlapping reports disagree on the current service state",
      });
    }
    if (pairs.length > 0) {
      await supabase.from("notifications").insert({
        role_scope: "DISTRICT_SUPERVISOR",
        kind: "CONFLICT",
        title: "Evidence conflict detected",
        body: "A new report disagrees with another recent report for the same facility and service.",
      });
    }

    // SUMMARISE — recompute reliability for this facility x service
    const breakdown = computeEri(all, new Date(), settings.thresholds);

    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "EVIDENCE_SUBMIT",
      resource: "evidence_events",
      resource_id: inserted?.id ?? null,
      metadata: {
        observation: data.observation,
        duplicate: duplicateOf != null,
        conflicts: pairs.length,
        eri: breakdown.eri,
      },
    });

    return {
      event: inserted,
      duplicate: duplicateOf != null,
      conflicts: pairs.length,
      breakdown,
    };
  });

/** GET /api/facilities/{id}/eri */
export const getFacilityEri = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ facility_id: z.string().uuid(), service_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const settings = await loadSettings(supabase);
    const { data: events } = await supabase
      .from("evidence_events")
      .select("*")
      .eq("facility_id", data.facility_id)
      .eq("service_id", data.service_id)
      .order("observed_at", { ascending: false })
      .limit(50);
    return {
      breakdown: computeEri((events ?? []) as EvidenceEvent[], new Date(), settings.thresholds),
      events: events ?? [],
    };
  });
