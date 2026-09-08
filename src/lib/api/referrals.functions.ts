import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRoles, loadSettings, referralCode, secureToken, writeAudit } from "./helpers";
import { rankCandidates, type CandidateInput } from "@/lib/evidence-engine/ranking";
import type { EvidenceEvent } from "@/lib/evidence-engine/models";

/**
 * Ranking pipeline: eligibility -> blocked removal -> evidence reliability -> distance.
 * Fully deterministic; no LLM involvement.
 */
export const rankFacilitiesForService = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        origin_facility_id: z.string().uuid(),
        service_id: z.string().uuid(),
        max_distance_km: z.number().min(1).max(500).nullish().transform((v) => v ?? null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const settings = await loadSettings(supabase);

    const { data: origin, error: originError } = await supabase
      .from("facilities")
      .select("*")
      .eq("id", data.origin_facility_id)
      .maybeSingle();
    if (originError || !origin) throw new Error("Referring facility not found");

    const { data: facilities } = await supabase.from("facilities").select("*");
    const { data: mappings } = await supabase
      .from("facility_services")
      .select("*")
      .eq("service_id", data.service_id);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events } = await supabase
      .from("evidence_events")
      .select("*")
      .eq("service_id", data.service_id)
      .gte("observed_at", since)
      .order("observed_at", { ascending: false });

    const byFacility = new Map<string, EvidenceEvent[]>();
    for (const e of (events ?? []) as EvidenceEvent[]) {
      const list = byFacility.get(e.facility_id) ?? [];
      list.push(e);
      byFacility.set(e.facility_id, list);
    }

    const candidates: CandidateInput[] = (facilities ?? [])
      .filter((f: any) => f.id !== origin.id)
      .map((f: any) => {
        const m = (mappings ?? []).find((x: any) => x.facility_id === f.id);
        return {
          facility: f,
          registered: Boolean(m?.is_registered),
          blocked: Boolean(m?.is_blocked),
          blocked_reason: m?.blocked_reason ?? null,
          events: byFacility.get(f.id) ?? [],
        };
      });

    const result = rankCandidates(origin, candidates, {
      weights: settings.weights,
      thresholds: settings.thresholds,
      maxDistanceKm: data.max_distance_km,
    });
    return { origin, ...result, weights: settings.weights, thresholds: settings.thresholds };
  });

const createSchema = z.object({
  patient_ref: z.string().min(3).max(40),
  origin_facility_id: z.string().uuid(),
  destination_facility_id: z.string().uuid(),
  service_id: z.string().uuid(),
  urgency: z.enum(["ROUTINE", "URGENT", "EMERGENCY"]).default("ROUTINE"),
  max_distance_km: z.number().min(1).max(500).nullish().transform((v) => v ?? null),
  notes: z.string().max(400).nullish().transform((v) => v ?? null),
  selected_eri: z.number().min(0).max(1),
  selected_distance_km: z.number().min(0),
  evidence_snapshot: z.record(z.string(), z.unknown()).default({}),
});

export const createReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const roles = await getRoles(supabase, userId);
    if (!roles.some((r) => ["REFERRAL_WORKER", "ADMIN"].includes(r))) {
      throw new Error("Forbidden: only referral workers or admins can create referrals");
    }
    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true });
    const token = secureToken();
    const { data: row, error } = await supabase
      .from("referrals")
      .insert({
        referral_code: referralCode((count ?? 0) + 1 + Math.floor(Math.random() * 3)),
        patient_ref: data.patient_ref,
        origin_facility_id: data.origin_facility_id,
        destination_facility_id: data.destination_facility_id,
        service_id: data.service_id,
        urgency: data.urgency,
        max_distance_km: data.max_distance_km,
        notes: data.notes,
        status: "CREATED",
        token,
        selected_eri: data.selected_eri,
        selected_distance_km: data.selected_distance_km,
        evidence_snapshot: data.evidence_snapshot as any,
        created_by: userId,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await supabase.from("referral_status_history").insert({
      referral_id: row!.id,
      from_status: null,
      to_status: "CREATED",
      changed_by: userId,
      note: "Referral created",
    });
    await supabase.from("notifications").insert({
      role_scope: "FACILITY_STAFF",
      kind: "REFERRAL_CREATED",
      title: `Incoming referral ${row!.referral_code}`,
      body: "A new referral has been created and is awaiting verification.",
      referral_id: row!.id,
    });
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "REFERRAL_CREATE",
      resource: "referrals",
      resource_id: row!.id,
      metadata: { code: row!.referral_code, eri: data.selected_eri },
    });
    return row;
  });

export const listReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("referrals")
      .select(
        "*, origin:origin_facility_id(name,code), destination:destination_facility_id(name,code), services(name,code)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: referral, error } = await supabase
      .from("referrals")
      .select(
        "*, origin:origin_facility_id(*), destination:destination_facility_id(*), services(name,code)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !referral) throw new Error("Referral not found");
    const { data: history } = await supabase
      .from("referral_status_history")
      .select("*")
      .eq("referral_id", data.id)
      .order("changed_at", { ascending: true });
    const { data: outcome } = await supabase
      .from("referral_outcomes")
      .select("*")
      .eq("referral_id", data.id)
      .maybeSingle();
    return { referral, history: history ?? [], outcome };
  });

/** POST /api/referrals/{id}/verify — token verification for facility staff. */
export const verifyReferralToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: row } = await supabase
      .from("referrals")
      .select(
        "id, referral_code, status, urgency, created_at, patient_ref, origin:origin_facility_id(name,code), destination:destination_facility_id(name,code), services(name,code)",
      )
      .eq("token", data.token.trim())
      .maybeSingle();
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "REFERRAL_VERIFY",
      resource: "referrals",
      resource_id: row?.id ?? null,
      result: row ? "SUCCESS" : "NOT_FOUND",
    });
    if (!row) return { valid: false as const };
    return { valid: true as const, referral: row };
  });

const STATUS_FLOW = ["CREATED", "ACCEPTED", "ARRIVED", "COMPLETED"] as const;

export const updateReferralStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([...STATUS_FLOW, "CANCELLED"]),
        note: z.string().max(240).nullish().transform((v) => v ?? null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: current } = await supabase
      .from("referrals")
      .select("id,status,referral_code")
      .eq("id", data.id)
      .maybeSingle();
    if (!current) throw new Error("Referral not found");
    const { error } = await supabase
      .from("referrals")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.from("referral_status_history").insert({
      referral_id: data.id,
      from_status: current.status,
      to_status: data.status,
      changed_by: userId,
      note: data.note,
    });
    await supabase.from("notifications").insert({
      role_scope: "REFERRAL_WORKER",
      kind: "REFERRAL_STATUS",
      title: `${current.referral_code}: ${data.status.replace("_", " ").toLowerCase()}`,
      body: data.note ?? "Referral status updated by the destination facility.",
      referral_id: data.id,
    });
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "REFERRAL_STATUS_UPDATE",
      resource: "referrals",
      resource_id: data.id,
      metadata: { from: current.status, to: data.status },
    });
    return { ok: true };
  });

/**
 * POST /api/referrals/{id}/outcome — LEARN.
 * Records the outcome, moves the referral, and converts the outcome into a new
 * evidence event so future rankings improve.
 */
export const recordReferralOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        outcome: z.enum(["SERVICE_PROVIDED", "SERVICE_UNAVAILABLE"]),
        notes: z.string().max(400).nullish().transform((v) => v ?? null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const roles = await getRoles(supabase, userId);
    if (!roles.some((r) => ["FACILITY_STAFF", "ADMIN", "REFERRAL_WORKER"].includes(r))) {
      throw new Error("Forbidden: you cannot record referral outcomes");
    }
    const { data: referral } = await supabase
      .from("referrals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!referral) throw new Error("Referral not found");

    const { error: outcomeError } = await supabase.from("referral_outcomes").insert({
      referral_id: data.id,
      outcome: data.outcome,
      notes: data.notes,
      recorded_by: userId,
    });
    if (outcomeError) throw new Error(outcomeError.message);

    await supabase
      .from("referrals")
      .update({ status: data.outcome, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    await supabase.from("referral_status_history").insert({
      referral_id: data.id,
      from_status: referral.status,
      to_status: data.outcome,
      changed_by: userId,
      note: data.notes,
    });

    // outcome becomes evidence
    const { data: evidence } = await supabase
      .from("evidence_events")
      .insert({
        facility_id: referral.destination_facility_id,
        service_id: referral.service_id,
        observation: data.outcome === "SERVICE_PROVIDED" ? "SERVICE_PROVIDED" : "UNAVAILABLE",
        observed_at: new Date().toISOString(),
        source: "REFERRAL_OUTCOME",
        notes: `Outcome of referral ${referral.referral_code}`,
        referral_id: data.id,
        created_by: userId,
      })
      .select("*")
      .maybeSingle();

    await supabase.from("notifications").insert({
      role_scope: "REFERRAL_WORKER",
      kind: "OUTCOME",
      title: `Outcome recorded for ${referral.referral_code}`,
      body: `${data.outcome.replace("_", " ").toLowerCase()} — the evidence ledger has been updated.`,
      referral_id: data.id,
    });
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "REFERRAL_OUTCOME",
      resource: "referrals",
      resource_id: data.id,
      metadata: { outcome: data.outcome, evidence_id: evidence?.id ?? null },
    });
    return { ok: true, evidence };
  });

export const listIncomingReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ facility_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("referrals")
      .select("*, origin:origin_facility_id(name,code), services(name,code)")
      .in("status", ["CREATED", "ACCEPTED", "ARRIVED"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.facility_id) q = q.eq("destination_facility_id", data.facility_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
