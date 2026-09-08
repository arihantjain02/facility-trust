import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRoles, loadSettings, requireRole, writeAudit } from "./helpers";

/** GET /api/auth/me — profile, roles and assigned facility. */
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email ?? "";
    let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) {
      const { data: inserted } = await supabase
        .from("profiles")
        .insert({ id: userId, email, full_name: email.split("@")[0] ?? "User" })
        .select("*")
        .maybeSingle();
      profile = inserted;
    }
    const roles = await getRoles(supabase, userId);
    let facility = null;
    if (profile?.facility_id) {
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", profile.facility_id)
        .maybeSingle();
      facility = data;
    }
    return { profile, roles, facility, email };
  });

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", userId);
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "LOGIN",
      resource: "auth",
      resource_id: userId,
    });
    return { ok: true };
  });

export const listFacilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("facilities")
      .select("*")
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("services").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listFacilityServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("facility_services").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const facilitySchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  type: z.enum(["PHC", "CHC", "DISTRICT_HOSPITAL"]),
  district: z.string().min(2).max(80),
  address: z.string().max(240).nullish().transform((v) => v ?? null),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contact: z.string().max(60).nullish().transform((v) => v ?? null),
  is_active: z.boolean().default(true),
});

export const saveFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => facilitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    requireRole(await getRoles(supabase, userId), ["ADMIN"]);
    const { id, ...fields } = data;
    const payload = { ...fields, updated_at: new Date().toISOString() };
    const query = id
      ? supabase.from("facilities").update(payload).eq("id", id).select("*").maybeSingle()
      : supabase
          .from("facilities")
          .insert({ ...payload, created_by: userId })
          .select("*")
          .maybeSingle();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: data.id ? "FACILITY_UPDATE" : "FACILITY_CREATE",
      resource: "facilities",
      resource_id: row?.id ?? null,
      metadata: { code: data.code },
    });
    return row;
  });

export const setFacilityActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    requireRole(await getRoles(supabase, userId), ["ADMIN"]);
    const { error } = await supabase
      .from("facilities")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: data.is_active ? "FACILITY_ACTIVATE" : "FACILITY_DEACTIVATE",
      resource: "facilities",
      resource_id: data.id,
    });
    return { ok: true };
  });

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(80),
  description: z.string().max(240).nullish().transform((v) => v ?? null),
  is_active: z.boolean().default(true),
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => serviceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    requireRole(await getRoles(supabase, userId), ["ADMIN"]);
    const { id, ...fields } = data;
    const query = id
      ? supabase.from("services").update(fields).eq("id", id).select("*").maybeSingle()
      : supabase.from("services").insert(fields).select("*").maybeSingle();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: data.id ? "SERVICE_UPDATE" : "SERVICE_CREATE",
      resource: "services",
      resource_id: row?.id ?? null,
    });
    return row;
  });

export const setFacilityServiceRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        facility_id: z.string().uuid(),
        service_id: z.string().uuid(),
        is_registered: z.boolean(),
        is_blocked: z.boolean().default(false),
        blocked_reason: z.string().max(160).nullish().transform((v) => v ?? null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const roles = await getRoles(supabase, userId);
    requireRole(roles, ["ADMIN", "FACILITY_STAFF", "DISTRICT_SUPERVISOR"]);
    const { data: existing } = await supabase
      .from("facility_services")
      .select("id")
      .eq("facility_id", data.facility_id)
      .eq("service_id", data.service_id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("facility_services")
        .update({
          is_registered: data.is_registered,
          is_blocked: data.is_blocked,
          blocked_reason: data.blocked_reason ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      requireRole(roles, ["ADMIN"]);
      const { error } = await supabase.from("facility_services").insert(data);
      if (error) throw new Error(error.message);
    }
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "FACILITY_SERVICE_UPDATE",
      resource: "facility_services",
      resource_id: `${data.facility_id}:${data.service_id}`,
      metadata: { blocked: data.is_blocked },
    });
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    requireRole(await getRoles(supabase, userId), ["ADMIN", "DISTRICT_SUPERVISOR"]);
    const { data: profiles } = await supabase.from("profiles").select("*").order("email");
    const { data: roles } = await supabase.from("user_roles").select("*");
    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadSettings(context.supabase));

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        thresholds: z.object({
          very_fresh_min: z.number().min(1).max(1440),
          fresh_min: z.number().min(2).max(2880),
          aging_min: z.number().min(3).max(10080),
        }),
        weights: z.object({
          eri: z.number().min(0).max(1),
          distance: z.number().min(0).max(1),
          distance_normalizer_km: z.number().min(1).max(500),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    requireRole(await getRoles(supabase, userId), ["ADMIN"]);
    const now = new Date().toISOString();
    const { error } = await supabase.from("system_settings").upsert([
      { key: "freshness_thresholds", value: data.thresholds, updated_at: now, updated_by: userId },
      { key: "ranking_weights", value: data.weights, updated_at: now, updated_by: userId },
    ]);
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      user_id: userId,
      actor_email: (claims as any)?.email ?? null,
      action: "SETTINGS_UPDATE",
      resource: "system_settings",
      metadata: data as unknown as Record<string, unknown>,
    });
    return { ok: true };
  });
