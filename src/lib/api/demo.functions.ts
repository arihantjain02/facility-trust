import { createServerFn } from "@tanstack/react-start";

export const DEMO_USERS = [
  { email: "worker@reliref.demo", password: "RelirefDemo#2026", role: "REFERRAL_WORKER", name: "Asha Rane (PHC referral worker)" },
  { email: "staff@reliref.demo", password: "RelirefDemo#2026", role: "FACILITY_STAFF", name: "Vikram Nair (CHC facility staff)" },
  { email: "supervisor@reliref.demo", password: "RelirefDemo#2026", role: "DISTRICT_SUPERVISOR", name: "Meera Joshi (district supervisor)" },
  { email: "admin@reliref.demo", password: "RelirefDemo#2026", role: "ADMIN", name: "System administrator" },
] as const;

/** Idempotently creates the four fictional demo accounts. */
export const provisionDemoUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const created: string[] = [];
  for (const u of DEMO_USERS) {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = existing?.users?.find((x) => x.email === u.email);
    if (!user) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });
      if (error && !String(error.message).includes("already")) throw new Error(error.message);
      user = data?.user ?? undefined;
      if (user) created.push(u.email);
    }
    if (!user) continue;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, email: u.email, full_name: u.name }, { onConflict: "id" });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: u.role as any }, { onConflict: "user_id,role" });
  }
  return { created, users: DEMO_USERS.map((u) => ({ email: u.email, role: u.role, name: u.name })) };
});
