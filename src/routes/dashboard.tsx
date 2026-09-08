import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { getDashboardAnalytics, getRecentActivity } from "@/lib/api/analytics.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Referral dashboard — RELI-REF" },
      { name: "description", content: "Live referral activity, evidence freshness and open conflicts across the district." },
      { property: "og:title", content: "Referral dashboard — RELI-REF" },
      { property: "og:description", content: "Live referral activity, evidence freshness and open conflicts across the district." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RequireAuth>
  ),
});

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const analytics = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardAnalytics() });
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => getRecentActivity() });
  const k = analytics.data?.kpis;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">District referral overview</h1>
          <p className="text-sm text-muted-foreground">
            Record → Check → Summarise → Decide → Rank → Learn
          </p>
        </div>
        <Link
          to="/referrals"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Start a referral
        </Link>
      </div>

      {analytics.isLoading && <p className="text-sm text-muted-foreground">Loading district data…</p>}
      {k && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Active referrals" value={k.activeReferrals} hint={`${k.totalReferrals} total`} />
          <Kpi label="Service provided rate" value={k.successRate == null ? "—" : `${k.successRate}%`} hint="From recorded outcomes" />
          <Kpi label="Evidence freshness" value={`${k.evidenceFreshness}%`} hint={`Avg age ${k.averageEvidenceAgeMin} min`} />
          <Kpi label="Open conflicts" value={k.openConflicts} hint={`${k.duplicates} duplicates filtered`} />
          <Kpi label="Facilities monitored" value={k.facilitiesMonitored} />
          <Kpi label="Services tracked" value={k.servicesTracked} />
          <Kpi label="Wasted trips recorded" value={k.avoidableFailures} hint="Arrived, service unavailable" />
          <Kpi label="Average travel" value={`${k.averageDistanceKm} km`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Latest reports</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(activity.data?.evidence ?? []).map((e: any) => (
              <li key={e.id} className="flex justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>
                  {e.facilities?.name} · {e.services?.name}
                </span>
                <span className="text-muted-foreground">{e.observation.replace("_", " ").toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Recent referrals</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(activity.data?.referrals ?? []).map((r: any) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>{r.referral_code}</span>
                <span className="text-muted-foreground">{r.status.replace("_", " ").toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Unresolved conflicts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(activity.data?.conflicts ?? []).length === 0 && (
              <li className="text-muted-foreground">No open conflicts.</li>
            )}
            {(activity.data?.conflicts ?? []).map((c: any) => (
              <li key={c.id} className="border-b border-border pb-2 last:border-0">
                {c.facilities?.name} · {c.services?.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
