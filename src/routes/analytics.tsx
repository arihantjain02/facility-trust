import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { getDashboardAnalytics } from "@/lib/api/analytics.functions";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Referral analytics — RELI-REF" },
      { name: "description", content: "Referral volume, outcome rates, evidence freshness and travel distance across the district." },
      { property: "og:title", content: "Referral analytics — RELI-REF" },
      { property: "og:description", content: "Referral volume, outcome rates, evidence freshness and travel distance across the district." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Analytics />
      </AppShell>
    </RequireAuth>
  ),
});

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-3 flex-1 rounded bg-secondary">
        <span className="block h-3 rounded bg-primary" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="w-10 text-right tabular-nums">{value}</span>
    </div>
  );
}

function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardAnalytics() });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  const maxDay = Math.max(1, ...data.charts.days.map((d) => d.total));
  const maxDist = Math.max(1, ...data.charts.distance.map((d) => d.count));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Referrals per day (14 days)</h2>
          <div className="mt-3 space-y-2">
            {data.charts.days.map((d) => (
              <Bar key={d.day} label={d.day} value={d.total} max={maxDay} />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Reported availability (7 days)</h2>
          <div className="mt-3 space-y-2">
            {data.charts.availability.map((d) => (
              <Bar key={d.day} label={d.day} value={d.positiveShare} max={100} />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Travel distance chosen</h2>
          <div className="mt-3 space-y-2">
            {data.charts.distance.map((d) => (
              <Bar key={d.bucket} label={d.bucket} value={d.count} max={maxDist} />
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Facility outcome rates</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {data.charts.facilityStats
                .filter((f) => f.referrals > 0)
                .map((f) => (
                  <tr key={f.code} className="border-t border-border">
                    <td className="py-1.5">{f.name}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{f.referrals} referrals</td>
                    <td className="py-1.5 text-right">{f.successRate == null ? "—" : `${f.successRate}%`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
