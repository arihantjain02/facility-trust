import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { getDashboardAnalytics, getRecentActivity } from "@/lib/api/analytics.functions";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  ReferralStatusPill,
  Section,
  SkeletonCards,
  SkeletonRows,
  StatCard,
  StatusPill,
  Td,
  Tr,
  humanise,
  observationTone,
  type Tone,
} from "@/components/ui-kit";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Public health referral operations — RELI-REF" },
      {
        name: "description",
        content: "Real-time view of referral reliability, facility evidence and service availability.",
      },
      { property: "og:title", content: "Public health referral operations — RELI-REF" },
      {
        property: "og:description",
        content: "Real-time view of referral reliability, facility evidence and service availability.",
      },
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

const RANGES = [
  { key: "24H", label: "24H", days: 1 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "90D", label: "90D", days: 90 },
] as const;

const chartConfig = {
  provided: { label: "Service provided", color: "var(--ok)" },
  failed: { label: "Service unavailable", color: "var(--danger)" },
} satisfies ChartConfig;

function trendFromSeries(days: Array<{ total: number }>, key: "total") {
  if (days.length < 4) return undefined;
  const half = Math.floor(days.length / 2);
  const first = days.slice(0, half);
  const second = days.slice(half);
  const sum = (arr: typeof days) => arr.reduce((s, d) => s + d[key], 0);
  const a = sum(first);
  const b = sum(second);
  if (a === 0) return undefined;
  const pct = Math.round(((b - a) / a) * 100);
  return pct;
}

function Dashboard() {
  const analytics = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardAnalytics() });
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => getRecentActivity() });
  const sync = useSyncStatus();
  const navigate = useNavigate();
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7D");
  const [now] = useState(() => new Date());

  const k = analytics.data?.kpis;
  const allDays = analytics.data?.charts.days ?? [];
  const maxAvailable = allDays.length;

  const selectedRange = RANGES.find((r) => r.key === range)!;
  const sliceDays = Math.min(selectedRange.days, maxAvailable);
  const visibleDays = useMemo(() => allDays.slice(Math.max(0, allDays.length - sliceDays)), [allDays, sliceDays]);
  const rangeCapped = selectedRange.days > maxAvailable;

  const totalTrend = trendFromSeries(allDays, "total");

  const facilityRanked = useMemo(() => {
    const stats = analytics.data?.charts.facilityStats ?? [];
    return [...stats]
      .filter((f) => f.referrals > 0)
      .sort((a, b) => (b.successRate ?? -1) - (a.successRate ?? -1) || b.referrals - a.referrals)
      .slice(0, 10);
  }, [analytics.data]);

  const conflictKeys = new Set(
    (activity.data?.conflicts ?? []).map((c: any) => `${c.facilities?.name}__${c.services?.name}`),
  );

  const anyError = analytics.isError || activity.isError;
  const apiTone: Tone = analytics.isError || activity.isError ? "danger" : "ok";
  const dbTone: Tone = analytics.isError ? "danger" : "ok";
  const engineTone: Tone = activity.isError ? "danger" : "ok";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Health Referral Operations"
        subtitle="Real-time view of referral reliability, facility evidence and service availability."
        meta={
          <>
            <span className="text-xs text-muted-foreground">
              {now.toLocaleString(undefined, {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <StatusPill tone={sync.online ? (sync.pending > 0 ? "info" : "ok") : "warn"}>
              {sync.online ? (sync.pending > 0 ? `${sync.pending} pending sync` : "Synchronised") : "Offline mode"}
            </StatusPill>
          </>
        }
        actions={
          <Button asChild>
            <Link to="/referrals/new">
              <PlusCircle /> Create referral
            </Link>
          </Button>
        }
      />

      {anyError && (
        <ErrorState
          message="Could not load dashboard data. Check your connection and try again."
          retry={() => {
            void analytics.refetch();
            void activity.refetch();
          }}
        />
      )}

      {analytics.isLoading ? (
        <SkeletonCards count={5} />
      ) : k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Active referrals"
            value={k.activeReferrals}
            hint={`${k.totalReferrals} total recorded`}
          />
          <StatCard
            label="Referral success rate"
            value={k.successRate == null ? "—" : `${k.successRate}%`}
            hint="Of settled referrals"
            {...(totalTrend !== undefined
              ? {
                  delta: `${totalTrend >= 0 ? "+" : ""}${totalTrend}% referral volume`,
                  deltaTone: (totalTrend >= 0 ? "ok" : "warn") as Tone,
                }
              : {})}
          />
          <StatCard
            label="Avoidable failures"
            value={k.avoidableFailures}
            hint="Arrived, service unavailable"
            deltaTone={k.avoidableFailures > 0 ? "danger" : "ok"}
          />
          <StatCard
            label="Evidence freshness"
            value={`${k.evidenceFreshness}%`}
            hint={`Avg age ${k.averageEvidenceAgeMin} min`}
          />
          <StatCard
            label="Facilities monitored"
            value={k.facilitiesMonitored}
            hint={`${k.servicesTracked} services tracked`}
          />
        </div>
      ) : (
        <EmptyState title="No analytics available" body="No referral or evidence data has been recorded yet." />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Section
          className="xl:col-span-2"
          title="Referral activity"
          description={
            rangeCapped
              ? `Requested ${selectedRange.label.toLowerCase()} range — showing last ${maxAvailable} days available`
              : `Total, provided and failed referrals — last ${sliceDays} days`
          }
          actions={
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-sunken"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          {analytics.isLoading ? (
            <SkeletonRows rows={6} />
          ) : visibleDays.length === 0 ? (
            <EmptyState title="No referral activity yet" body="Referral records will appear here once created." />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <BarChart data={visibleDays} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="provided" stackId="a" fill="var(--color-provided)" radius={[0, 0, 2, 2]} />
                <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </Section>

        <Section title="System health" description="Live status of core services">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span>API</span>
              <StatusPill tone={apiTone}>{apiTone === "ok" ? "Operational" : "Degraded"}</StatusPill>
            </li>
            <li className="flex items-center justify-between">
              <span>Database</span>
              <StatusPill tone={dbTone}>{dbTone === "ok" ? "Operational" : "Degraded"}</StatusPill>
            </li>
            <li className="flex items-center justify-between">
              <span>Evidence engine</span>
              <StatusPill tone={engineTone}>{engineTone === "ok" ? "Operational" : "Degraded"}</StatusPill>
            </li>
            <li className="flex items-center justify-between">
              <span>Synchronisation</span>
              <StatusPill tone={sync.online ? "ok" : "warn"}>{sync.online ? "Online" : "Offline"}</StatusPill>
            </li>
            <li className="flex items-center justify-between">
              <span>Pending sync</span>
              <span className="tabular-nums text-muted-foreground">{sync.pending}</span>
            </li>
          </ul>
        </Section>
      </div>

      <Section
        title="Facility reliability overview"
        description="Ranked by referral success rate, then volume"
      >
        {analytics.isLoading ? (
          <SkeletonRows rows={5} />
        ) : facilityRanked.length === 0 ? (
          <EmptyState title="No facility referral data yet" body="Rankings appear once referrals are recorded against facilities." />
        ) : (
          <DataTable head={["Rank", "Facility", "Referrals", "Success rate"]}>
            {facilityRanked.map((f, i) => (
              <Tr key={f.code} onClick={() => navigate({ to: "/facilities" })}>
                <Td className="w-10 tabular-nums text-muted-foreground">{i + 1}</Td>
                <Td className="min-w-0">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{f.code}</span>
                </Td>
                <Td className="tabular-nums">{f.referrals}</Td>
                <Td>
                  {f.successRate == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <StatusPill tone={f.successRate >= 70 ? "ok" : f.successRate >= 40 ? "warn" : "danger"}>
                      {f.successRate}%
                    </StatusPill>
                  )}
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Evidence activity" description="Most recent service observations" className="xl:col-span-1">
          {activity.isLoading ? (
            <SkeletonRows rows={6} />
          ) : (activity.data?.evidence ?? []).length === 0 ? (
            <EmptyState title="No evidence recorded yet" />
          ) : (
            <ul className="space-y-2">
              {(activity.data?.evidence ?? []).map((e: any) => {
                const conflicted = conflictKeys.has(`${e.facilities?.name}__${e.services?.name}`);
                return (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                      conflicted ? "border-warn/35 bg-warn-soft/40" : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {e.facilities?.name} · {e.services?.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(e.observed_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {humanise(e.source)}
                        {conflicted ? " · unresolved conflict" : ""}
                      </p>
                    </div>
                    <StatusPill tone={observationTone(e.observation)} className="shrink-0">
                      {humanise(e.observation)}
                    </StatusPill>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Recent referrals" description="Latest referral records">
          {activity.isLoading ? (
            <SkeletonRows rows={6} />
          ) : (activity.data?.referrals ?? []).length === 0 ? (
            <EmptyState title="No referrals recorded yet" />
          ) : (
            <ul className="space-y-2">
              {(activity.data?.referrals ?? []).map((r: any) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.referral_code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.destination?.name ?? "Unassigned"} · {r.services?.name}
                    </p>
                  </div>
                  <ReferralStatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Unresolved conflicts" description="Evidence needing review">
          {activity.isLoading ? (
            <SkeletonRows rows={4} />
          ) : (activity.data?.conflicts ?? []).length === 0 ? (
            <EmptyState title="No open conflicts" body="Reported evidence is currently consistent." />
          ) : (
            <ul className="space-y-2">
              {(activity.data?.conflicts ?? []).map((c: any) => (
                <li key={c.id} className="rounded-sm border border-warn/30 bg-warn-soft/40 px-3 py-2 text-sm">
                  <p className="truncate font-medium">
                    {c.facilities?.name} · {c.services?.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Detected {new Date(c.detected_at).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
