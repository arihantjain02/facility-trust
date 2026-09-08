import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadSettings } from "./helpers";
import { ageMinutes, freshnessBand } from "@/lib/evidence-engine/freshness";

/** GET /api/analytics/dashboard — every number comes from the database. */
export const getDashboardAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const settings = await loadSettings(supabase);
    const now = new Date();

    const [{ data: referrals }, { data: evidence }, { data: conflicts }, { data: facilities }, { data: services }] =
      await Promise.all([
        supabase
          .from("referrals")
          .select("id,status,created_at,selected_distance_km,selected_eri,destination_facility_id,service_id")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("evidence_events")
          .select("id,observed_at,observation,facility_id,service_id,source,is_duplicate")
          .order("observed_at", { ascending: false })
          .limit(1000),
        supabase.from("evidence_conflicts").select("id,resolved"),
        supabase.from("facilities").select("id,name,code,type,is_active"),
        supabase.from("services").select("id,name,code"),
      ]);

    const refs = referrals ?? [];
    const evs = evidence ?? [];
    const active = refs.filter((r: any) => ["CREATED", "ACCEPTED", "ARRIVED"].includes(r.status));
    const provided = refs.filter((r: any) => r.status === "SERVICE_PROVIDED").length;
    const unavailable = refs.filter((r: any) => r.status === "SERVICE_UNAVAILABLE").length;
    const settled = provided + unavailable;

    const freshnessCounts = { VERY_FRESH: 0, FRESH: 0, AGING: 0, STALE: 0 } as Record<string, number>;
    let ageSum = 0;
    for (const e of evs) {
      const age = ageMinutes(e.observed_at, now);
      ageSum += age;
      freshnessCounts[freshnessBand(age, settings.thresholds)] += 1;
    }
    const freshShare = evs.length
      ? (freshnessCounts.VERY_FRESH! + freshnessCounts.FRESH!) / evs.length
      : 0;

    // referrals over time (last 14 days)
    const days: Array<{ day: string; total: number; provided: number; failed: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const dayRefs = refs.filter((r: any) => String(r.created_at).slice(0, 10) === key);
      days.push({
        day: key.slice(5),
        total: dayRefs.length,
        provided: dayRefs.filter((r: any) => r.status === "SERVICE_PROVIDED").length,
        failed: dayRefs.filter((r: any) => r.status === "SERVICE_UNAVAILABLE").length,
      });
    }

    // availability trend from evidence over the last 7 days
    const availability: Array<{ day: string; positiveShare: number; reports: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const key = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      const dayEvs = evs.filter((e: any) => String(e.observed_at).slice(0, 10) === key);
      const pos = dayEvs.filter((e: any) =>
        ["AVAILABLE", "SERVICE_PROVIDED"].includes(e.observation),
      ).length;
      availability.push({
        day: key.slice(5),
        positiveShare: dayEvs.length ? Math.round((pos / dayEvs.length) * 100) : 0,
        reports: dayEvs.length,
      });
    }

    // facility reliability by observed outcomes
    const facilityStats = (facilities ?? []).map((f: any) => {
      const own = refs.filter((r: any) => r.destination_facility_id === f.id);
      const ok = own.filter((r: any) => r.status === "SERVICE_PROVIDED").length;
      const bad = own.filter((r: any) => r.status === "SERVICE_UNAVAILABLE").length;
      return {
        name: f.name,
        code: f.code,
        referrals: own.length,
        successRate: ok + bad > 0 ? Math.round((ok / (ok + bad)) * 100) : null,
      };
    });

    // distance distribution
    const buckets = [5, 10, 20, 30, 50, 1000];
    const distance = buckets.map((b, i) => {
      const lower = i === 0 ? 0 : buckets[i - 1]!;
      const count = refs.filter(
        (r: any) => Number(r.selected_distance_km ?? 0) > lower && Number(r.selected_distance_km ?? 0) <= b,
      ).length;
      return { bucket: b === 1000 ? "50+ km" : `${lower}-${b} km`, count };
    });

    const staleSelections = refs.filter((r: any) => Number(r.selected_eri ?? 0) < 0.25).length;

    return {
      kpis: {
        activeReferrals: active.length,
        totalReferrals: refs.length,
        successRate: settled ? Math.round((provided / settled) * 100) : null,
        avoidableFailures: unavailable,
        evidenceFreshness: Math.round(freshShare * 100),
        facilitiesMonitored: (facilities ?? []).filter((f: any) => f.is_active).length,
        servicesTracked: (services ?? []).length,
        openConflicts: (conflicts ?? []).filter((c: any) => !c.resolved).length,
        evidenceEvents: evs.length,
        duplicates: evs.filter((e: any) => e.is_duplicate).length,
        averageEvidenceAgeMin: evs.length ? Math.round(ageSum / evs.length) : 0,
        averageDistanceKm: refs.length
          ? Math.round(
              (refs.reduce((s: number, r: any) => s + Number(r.selected_distance_km ?? 0), 0) /
                refs.length) *
                10,
            ) / 10
          : 0,
        staleSelections,
      },
      charts: { days, availability, facilityStats, distance, freshnessCounts },
      thresholds: settings.thresholds,
    };
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: evidence }, { data: referrals }, { data: conflicts }] = await Promise.all([
      supabase
        .from("evidence_events")
        .select("id,observation,observed_at,source, facilities(name), services(name)")
        .order("observed_at", { ascending: false })
        .limit(8),
      supabase
        .from("referrals")
        .select("id,referral_code,status,created_at, destination:destination_facility_id(name), services(name)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("evidence_conflicts")
        .select("id,detected_at,resolved, facilities(name), services(name)")
        .eq("resolved", false)
        .order("detected_at", { ascending: false })
        .limit(5),
    ]);
    return { evidence: evidence ?? [], referrals: referrals ?? [], conflicts: conflicts ?? [] };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
