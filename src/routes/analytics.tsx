import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { getDashboardAnalytics } from "@/lib/api/analytics.functions";
import { DemoNote } from "@/components/insight/demo-note";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  SkeletonCards,
  SkeletonRows,
  StatCard,
  StatusPill,
  Td,
  Tr,
} from "@/components/ui-kit";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "District analytics — RELI-REF" },
      {
        name: "description",
        content: "District analytics command centre: referral outcomes, evidence freshness, distance and facility performance.",
      },
      { property: "og:title", content: "District analytics — RELI-REF" },
      {
        property: "og:description",
        content: "District analytics command centre: referral outcomes, evidence freshness, distance and facility performance.",
      },
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

const RANGES = [
  { key: "7D", label: "7 days", days: 7 },
  { key: "14D", label: "14 days", days: 14 },
  { key: "30D", label: "30 days", days: 30 },
] as const;

const outcomeConfig = {
  provided: { label: "Service provided", color: "var(--ok)" },
  failed: { label: "Service unavailable", color: "var(--danger)" },
} satisfies ChartConfig;

const availabilityConfig = {
  positiveShare: { label: "Positive report share (%)", color: "var(--info)" },
} satisfies ChartConfig;

const distanceConfig = {
  count: { label: "Referrals", color: "var(--primary)" },
} satisfies ChartConfig;

const facilityConfig = {
  successRate: { label: "Success rate (%)", color: "var(--accent)" },
} satisfies ChartConfig;

const FRESHNESS_LABEL: Record<string, string> = {
  VERY_FRESH: "Very fresh",
  FRESH: "Fresh",
  AGING: "Aging",
  STALE: "Stale",
};
const FRESHNESS_COLOR: Record<string, string> = {
  VERY_FRESH: "var(--ok)",
  FRESH: "var(--info)",
  AGING: "var(--warn)",
  STALE: "var(--stale)",
};
const freshnessConfig = {
  VERY_FRESH: { label: "Very fresh", color: "var(--ok)" },
  FRESH: { label: "Fresh", color: "var(--info)" },
  AGING: { label: "Aging", color: "var(--warn)" },
  STALE: { label: "Stale", color: "var(--stale)" },
} satisfies ChartConfig;

type SortKey = "name" | "referrals" | "successRate";

function Analytics() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardAnalytics(),
  });
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("14D");
  const [sortKey, setSortKey] = useState<SortKey>("successRate");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const allDays = data?.charts.days ?? [];
  const selectedRange = RANGES.find((r) => r.key === range)!;
  const sliceDays = Math.min(selectedRange.days, allDays.length);
  const visibleDays = useMemo(
    () => allDays.slice(Math.max(0, allDays.length - sliceDays)),
    [allDays, sliceDays],
  );
  const rangeCapped = selectedRange.days > allDays.length;

  const freshnessData = useMemo(() => {
    const counts = data?.charts.freshnessCounts ?? {};
    return Object.entries(counts).map(([band, value]) => ({
      band,
      label: FRESHNESS_LABEL[band] ?? band,
      value,
      fill: FRESHNESS_COLOR[band] ?? "var(--muted-foreground)",
    }));
  }, [data]);

  const facilityRows = useMemo(() => {
    const rows = (data?.charts.facilityStats ?? []).filter((f) => f.referrals > 0);
    const sorted = [...rows].sort((a, b) => {
      const av = sortKey === "name" ? a.name : (a[sortKey] ?? -1);
      const bv = sortKey === "name" ? b.name : (b[sortKey] ?? -1);
      if (typeof av === "string" || typeof bv === "string") {
        return sortDir * String(av).localeCompare(String(bv));
      }
      return sortDir * ((av as number) - (bv as number));
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const facilityChartData = useMemo(
    () =>
      facilityRows
        .filter((f) => f.successRate != null)
        .slice(0, 10)
        .map((f) => ({ name: f.name, successRate: f.successRate ?? 0 })),
    [facilityRows],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const k = data?.kpis;
  const t = data?.thresholds;

  return (
    <div className="space-y-6">
      <PageHeader
        title="District analytics"
        subtitle="Referral outcomes, evidence freshness and travel distance across the district, computed from recorded data."
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
      />

      {isError && (
        <ErrorState message="Could not load analytics data." retry={() => void refetch()} />
      )}

      {isLoading ? (
        <SkeletonCards count={8} />
      ) : k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Referral success rate" value={k.successRate == null ? "—" : `${k.successRate}%`} hint="Of settled referrals" />
          <StatCard label="Avoidable failures" value={k.avoidableFailures} deltaTone={k.avoidableFailures > 0 ? "danger" : "ok"} hint="Arrived, service unavailable" />
          <StatCard label="Evidence freshness" value={`${k.evidenceFreshness}%`} hint="Very fresh + fresh share" />
          <StatCard label="Average evidence age" value={`${k.averageEvidenceAgeMin} min`} hint={`${k.evidenceEvents} events recorded`} />
          <StatCard label="Average distance" value={`${k.averageDistanceKm} km`} hint="Per selected referral" />
          <StatCard label="Stale selections" value={k.staleSelections} deltaTone={k.staleSelections > 0 ? "warn" : "ok"} hint="Chosen with ERI < 0.25" />
          <StatCard label="Open conflicts" value={k.openConflicts} deltaTone={k.openConflicts > 0 ? "danger" : "ok"} hint="Unresolved evidence conflicts" />
          <StatCard label="Duplicates" value={k.duplicates} hint="Flagged evidence reports" />
        </div>
      ) : (
        <EmptyState title="No analytics available" body="No referral or evidence data has been recorded yet." />
      )}
      <DemoNote />

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Referral volume & outcomes"
          description={
            rangeCapped
              ? `Requested ${selectedRange.label} — showing all ${allDays.length} days available`
              : `Total, provided and failed referrals — last ${sliceDays} days`
          }
        >
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : visibleDays.length === 0 ? (
            <EmptyState title="No referral activity yet" />
          ) : (
            <ChartContainer config={outcomeConfig} className="aspect-auto h-72 w-full">
              <BarChart data={visibleDays} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: "Day", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} label={{ value: "Referrals", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="provided" stackId="a" fill="var(--color-provided)" radius={[0, 0, 2, 2]} />
                <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          <DemoNote className="mt-2" />
        </Section>

        <Section title="Availability trend" description="Share of positive availability reports — last 7 days">
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : (data?.charts.availability ?? []).length === 0 ? (
            <EmptyState title="No evidence reports yet" />
          ) : (
            <ChartContainer config={availabilityConfig} className="aspect-auto h-72 w-full">
              <LineChart data={data!.charts.availability} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: "Day", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} domain={[0, 100]} label={{ value: "Positive share (%)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="positiveShare" stroke="var(--color-positiveShare)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          )}
          <DemoNote className="mt-2" />
        </Section>

        <Section title="Distance distribution" description="Distance travelled for the selected referral destination">
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : (data?.charts.distance ?? []).every((d) => d.count === 0) ? (
            <EmptyState title="No distance data yet" />
          ) : (
            <ChartContainer config={distanceConfig} className="aspect-auto h-72 w-full">
              <BarChart data={data!.charts.distance} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: "Distance bucket", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} label={{ value: "Referrals", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          <DemoNote className="mt-2" />
        </Section>

        <Section title="Evidence freshness distribution" description="Age band of the most recently recorded evidence">
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : freshnessData.every((f) => f.value === 0) ? (
            <EmptyState title="No evidence recorded yet" />
          ) : (
            <ChartContainer config={freshnessConfig} className="aspect-auto h-72 w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent nameKey="label" />} />
                <Pie data={freshnessData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {freshnessData.map((f) => (
                    <Cell key={f.band} fill={f.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <DemoNote className="mt-2" />
        </Section>
      </div>

      <Section title="Facility performance comparison" description="Top facilities by success rate, among those with recorded referrals">
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : facilityChartData.length === 0 ? (
          <EmptyState title="No facility performance data yet" />
        ) : (
          <ChartContainer config={facilityConfig} className="aspect-auto h-80 w-full">
            <BarChart data={facilityChartData} layout="vertical" accessibilityLayer margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} label={{ value: "Success rate (%)", position: "insideBottom", offset: -4, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={140} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="successRate" fill="var(--color-successRate)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        <DemoNote className="mt-2" />
      </Section>

      <Section title="Facility performance table" description="Sortable — click a column header">
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : facilityRows.length === 0 ? (
          <EmptyState title="No facility referral data yet" />
        ) : (
          <DataTable
            head={[
              <button key="name" onClick={() => toggleSort("name")} className="hover:text-foreground">
                Facility {sortKey === "name" ? (sortDir === 1 ? "▲" : "▼") : ""}
              </button>,
              <button key="referrals" onClick={() => toggleSort("referrals")} className="hover:text-foreground">
                Referrals {sortKey === "referrals" ? (sortDir === 1 ? "▲" : "▼") : ""}
              </button>,
              <button key="successRate" onClick={() => toggleSort("successRate")} className="hover:text-foreground">
                Success rate {sortKey === "successRate" ? (sortDir === 1 ? "▲" : "▼") : ""}
              </button>,
            ]}
          >
            {facilityRows.map((f) => (
              <Tr key={f.code}>
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
        <DemoNote className="mt-2" />
      </Section>

      <Section title="Thresholds in force" description="Configuration currently applied by the evidence engine">
        {t ? (
          <ul className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <li className="rounded-sm border border-border bg-surface-sunken p-3">
              <p className="font-medium">Very fresh</p>
              <p className="mt-1 text-muted-foreground">Evidence younger than {t.very_fresh_min ?? "—"} minutes counts as very fresh.</p>
            </li>
            <li className="rounded-sm border border-border bg-surface-sunken p-3">
              <p className="font-medium">Fresh</p>
              <p className="mt-1 text-muted-foreground">Evidence up to {t.fresh_min ?? "—"} minutes old still counts as fresh.</p>
            </li>
            <li className="rounded-sm border border-border bg-surface-sunken p-3">
              <p className="font-medium">Aging</p>
              <p className="mt-1 text-muted-foreground">Evidence up to {t.aging_min ?? "—"} minutes old is treated as aging; beyond that it is stale.</p>
            </li>
          </ul>
        ) : (
          <EmptyState title="Thresholds unavailable" />
        )}
        <DemoNote className="mt-2" />
      </Section>
    </div>
  );
}
