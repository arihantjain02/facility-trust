import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listEvidence, submitEvidence } from "@/lib/api/evidence.functions";
import { listFacilities, listServices } from "@/lib/api/core.functions";
import { enqueue, readQueue, remove } from "@/lib/offline-queue";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  PageHeader,
  Section,
  StatCard,
  DataTable,
  Tr,
  Td,
  EmptyState,
  ErrorState,
  SkeletonRows,
  SkeletonCards,
  StatusPill,
  humanise,
  observationTone,
} from "@/components/ui-kit";
import { FreshnessTag } from "@/components/eri-badge";
import { ageMinutes, freshnessBand, DEFAULT_DUPLICATE_WINDOW_MIN } from "@/lib/evidence-engine/index";
import { DEFAULT_CONFLICT_WINDOW_MIN } from "@/lib/evidence-engine/conflict";
import { RecordObservationDialog } from "@/components/evidence/record-observation-dialog";
import { EvidenceDetailSheet, type LedgerEntry } from "@/components/evidence/evidence-detail-sheet";
import { OfflineQueuePanel } from "@/components/evidence/offline-queue-panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileClock } from "lucide-react";

export const Route = createFileRoute("/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence ledger — RELI-REF" },
      {
        name: "description",
        content: "Append-only ledger of service availability reports with duplicate and conflict checks.",
      },
      { property: "og:title", content: "Evidence ledger — RELI-REF" },
      {
        property: "og:description",
        content: "Append-only ledger of service availability reports with duplicate and conflict checks.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <EvidencePage />
      </AppShell>
    </RequireAuth>
  ),
});

const OBSERVATION_FILTERS = ["AVAILABLE", "UNAVAILABLE", "TEMPORARILY_BLOCKED", "SERVICE_PROVIDED"];
const SOURCE_FILTERS = ["FACILITY_STAFF", "DISTRICT_SUPERVISOR", "OFFLINE_SYNC", "REFERRAL_OUTCOME", "DEMO_SEED"];
const FRESHNESS_FILTERS = ["VERY_FRESH", "FRESH", "AGING", "STALE"];
const ALL = "__all";

function EvidencePage() {
  const qc = useQueryClient();
  const sync = useSyncStatus();
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const ledger = useQuery({ queryKey: ["evidence"], queryFn: () => listEvidence({ data: {} }) });

  const [queued, setQueued] = useState(readQueue());
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const [facilityFilter, setFacilityFilter] = useState(ALL);
  const [serviceFilter, setServiceFilter] = useState(ALL);
  const [observationFilter, setObservationFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [freshnessFilter, setFreshnessFilter] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const refreshQueue = () => setQueued(readQueue());

  const events = (ledger.data?.events ?? []) as LedgerEntry[];
  const thresholds = ledger.data?.thresholds;

  const filtered = useMemo(() => {
    if (!thresholds) return events;
    return events.filter((e) => {
      if (facilityFilter !== ALL && e.facility_id !== facilityFilter) return false;
      if (serviceFilter !== ALL && e.service_id !== serviceFilter) return false;
      if (observationFilter !== ALL && e.observation !== observationFilter) return false;
      if (sourceFilter !== ALL && e.source !== sourceFilter) return false;
      if (freshnessFilter !== ALL) {
        const band = freshnessBand(ageMinutes(e.observed_at), thresholds);
        if (band !== freshnessFilter) return false;
      }
      if (dateFrom && new Date(e.observed_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(e.observed_at) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [events, thresholds, facilityFilter, serviceFilter, observationFilter, sourceFilter, freshnessFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = events.length;
    const freshCount = thresholds
      ? events.filter((e) => {
          const band = freshnessBand(ageMinutes(e.observed_at), thresholds);
          return band === "VERY_FRESH" || band === "FRESH";
        }).length
      : 0;
    const openConflicts = events.filter((e) => e.in_conflict).length;
    const duplicates = events.filter((e) => e.is_duplicate).length;
    const avgAgeMin = total
      ? Math.round(events.reduce((sum, e) => sum + ageMinutes(e.observed_at), 0) / total)
      : 0;
    return { total, freshShare: total ? Math.round((freshCount / total) * 100) : 0, openConflicts, duplicates, avgAgeMin };
  }, [events, thresholds]);

  const handleRecorded = () => {
    qc.invalidateQueries({ queryKey: ["evidence"] });
  };

  const syncAll = async () => {
    setSyncing(true);
    for (const item of readQueue()) {
      try {
        await submitEvidence({ data: { ...(item.payload as any), source: "OFFLINE_SYNC" } });
        remove(item.id);
      } catch {
        break;
      }
    }
    setQueued(readQueue());
    setSyncing(false);
    qc.invalidateQueries({ queryKey: ["evidence"] });
  };

  const facilityOptions = facilities.data ?? [];
  const serviceOptions = services.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Ledger"
        subtitle="Append-only record of reported service observations. Entries are never edited or deleted."
        actions={
          <RecordObservationDialog
            facilities={facilityOptions}
            services={serviceOptions}
            onRecorded={handleRecorded}
            onQueued={refreshQueue}
          />
        }
      />

      <OfflineQueuePanel
        queued={queued}
        online={sync.online}
        lastSync={sync.lastSync}
        syncing={syncing}
        onSyncAll={syncAll}
        onRefresh={refreshQueue}
      />

      {ledger.isLoading ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total entries" value={stats.total} icon={<FileClock className="size-4" />} />
          <StatCard label="Fresh share" value={`${stats.freshShare}%`} hint="Very fresh + fresh" />
          <StatCard label="Open conflicts" value={stats.openConflicts} deltaTone={stats.openConflicts > 0 ? "warn" : "ok"} />
          <StatCard label="Duplicates suppressed" value={stats.duplicates} />
          <StatCard label="Avg. evidence age" value={`${stats.avgAgeMin}m`} />
        </div>
      )}

      <Section title="How this ledger is interpreted" className="bg-surface-sunken">
        {thresholds ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Observations decay in weight over time: reports up to {thresholds.very_fresh_min} minutes
            old are <strong>very fresh</strong>, up to {thresholds.fresh_min} minutes are{" "}
            <strong>fresh</strong>, up to {thresholds.aging_min} minutes are <strong>aging</strong>, and
            anything older is <strong>stale</strong> but never discarded. Reports for the same facility
            and service, from the same source, within {DEFAULT_DUPLICATE_WINDOW_MIN} minutes of each
            other are treated as duplicates and excluded from scoring. Reports that disagree in
            direction within a {DEFAULT_CONFLICT_WINDOW_MIN}-minute overlap window are flagged as
            conflicts, which reduce the consistency (C) component of the Evidence Reliability Index.
          </p>
        ) : (
          <SkeletonRows rows={2} />
        )}
      </Section>

      <Section
        title="Filters"
        bodyClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <FilterSelect label="Facility" value={facilityFilter} onChange={setFacilityFilter}>
          {facilityOptions.map((f: any) => (
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter}>
          {serviceOptions.map((s: any) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Observation" value={observationFilter} onChange={setObservationFilter}>
          {OBSERVATION_FILTERS.map((o) => (
            <SelectItem key={o} value={o}>{humanise(o)}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter}>
          {SOURCE_FILTERS.map((s) => (
            <SelectItem key={s} value={s}>{humanise(s)}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Freshness" value={freshnessFilter} onChange={setFreshnessFilter}>
          {FRESHNESS_FILTERS.map((f) => (
            <SelectItem key={f} value={f}>{humanise(f)}</SelectItem>
          ))}
        </FilterSelect>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date range</Label>
          <div className="flex items-center gap-1.5">
            <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="h-9 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Ledger" description={`${filtered.length} of ${events.length} entries shown`}>
        {ledger.isLoading ? (
          <SkeletonRows rows={8} />
        ) : ledger.isError ? (
          <ErrorState message={(ledger.error as Error).message} retry={() => ledger.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No entries match these filters" body="Try widening the filters or record a new observation." />
        ) : (
          <DataTable head={["Timestamp", "Facility", "Service", "Observation", "Source", "Reporter", "Freshness", "Weight", "Flags"]}>
            {filtered.slice(0, 200).map((e) => {
              const band = thresholds ? freshnessBand(ageMinutes(e.observed_at), thresholds) : "NONE";
              return (
                <Tr key={e.id} onClick={() => setSelected(e)}>
                  <Td className="whitespace-nowrap font-mono text-xs">{new Date(e.observed_at).toLocaleString()}</Td>
                  <Td className="max-w-[10rem] truncate">{e.facilities?.name ?? "—"}</Td>
                  <Td className="max-w-[9rem] truncate">{e.services?.name ?? "—"}</Td>
                  <Td>
                    <StatusPill tone={observationTone(e.observation)}>{humanise(e.observation)}</StatusPill>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{humanise(e.source)}</Td>
                  <Td className="text-xs text-muted-foreground">{e.created_by ? "Registered user" : "—"}</Td>
                  <Td><FreshnessTag band={band} /></Td>
                  <Td className="text-xs tabular-nums text-muted-foreground">
                    {e.is_duplicate ? "excluded" : "weighted"}
                  </Td>
                  <Td className="space-x-1">
                    {e.is_duplicate && <FreshnessTag band="duplicate" />}
                    {e.in_conflict && <FreshnessTag band="conflict" />}
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        )}
      </Section>

      {thresholds && (
        <EvidenceDetailSheet
          entry={selected}
          allEvents={events}
          thresholds={thresholds}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}
