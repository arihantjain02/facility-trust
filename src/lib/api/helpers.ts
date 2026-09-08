// Shared, isomorphic helpers for the server API layer.
// No server-only imports here: these functions receive a Supabase client.
import { DEFAULT_THRESHOLDS, type FreshnessThresholds } from "@/lib/evidence-engine/models";
import { DEFAULT_WEIGHTS, type RankingWeights } from "@/lib/evidence-engine/ranking";

export type AnySupabase = {
  from: (table: string) => any;
};

export async function loadSettings(supabase: AnySupabase): Promise<{
  thresholds: FreshnessThresholds;
  weights: RankingWeights;
}> {
  const { data } = await supabase.from("system_settings").select("key,value");
  const map = new Map<string, any>((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    thresholds: { ...DEFAULT_THRESHOLDS, ...(map.get("freshness_thresholds") ?? {}) },
    weights: { ...DEFAULT_WEIGHTS, ...(map.get("ranking_weights") ?? {}) },
  };
}

export async function writeAudit(
  supabase: AnySupabase,
  entry: {
    user_id?: string | null;
    actor_email?: string | null;
    action: string;
    resource: string;
    resource_id?: string | null;
    result?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("audit_logs").insert({
    user_id: entry.user_id ?? null,
    actor_email: entry.actor_email ?? null,
    action: entry.action,
    resource: entry.resource,
    resource_id: entry.resource_id ?? null,
    result: entry.result ?? "SUCCESS",
    metadata: entry.metadata ?? {},
  });
}

export async function getRoles(supabase: AnySupabase, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as string);
}

export function requireRole(roles: string[], allowed: string[]): void {
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error(`Forbidden: this action requires one of ${allowed.join(", ")}`);
  }
}

export function referralCode(sequence: number): string {
  return `REF-2026-${String(sequence).padStart(6, "0")}`;
}

export function secureToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
