import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listFacilities, listFacilityServices, listServices } from "@/lib/api/core.functions";
import { listEvidence } from "@/lib/api/evidence.functions";
import {
  PageHeader,
  Section,
  DataTable,
  Tr,
  Td,
  EmptyState,
  ErrorState,
  SkeletonRows,
  StatusPill,
  humanise,
} from "@/components/ui-kit";
import { EriBadge } from "@/components/eri-badge";
import { computeEri } from "@/lib/evidence-engine/scoring";
import { formatAge, ageMinutes } from "@/lib/evidence-engine/freshness";
import type { EvidenceEvent } from "@/lib/evidence-engine/models";
import { FacilityDetailSheet } from "@/components/evidence/facility-detail-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export const Route = createFileRoute("/facilities")({
  head: () => ({
    meta: [
      { title: "Facilities — RELI-REF" },
      { name: "description", content: "Facility directory with registered services and current evidence-based reliability." },
      { property: "og:title", content: "Facilities — RELI-REF" },
      { property: "og:description", content: "Facility directory with registered services and current evidence-based reliability." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <FacilitiesPage />
      </AppShell>
    </RequireAuth>
  ),
});

const ALL = "__all";
const FACILITY_TYPES = ["PHC", "CHC", "DISTRICT_HOSPITAL"];

function FacilitiesPage() {
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const facilityServices = useQuery({ queryKey: ["facility-services"], queryFn: () => listFacilityServices() });
  const evidence = useQuery({ queryKey: ["evidence"], queryFn: () => listEvidence({ data: {} }) });

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [districtFilter, setDistrictFilter] = useState(ALL);
  const [availabilityFilter, setAvailabilityFilter] = useState(ALL);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  const facilityList = (facilities.data ?? []) as any[];
  const serviceList = (services.data ?? []) as any[];
  const facilityServiceList = (facilityServices.data ?? []) as any[];
  const events = (evidence.data?.events ?? []) as EvidenceEvent[];
  const thresholds = evidence.data?.thresholds;

  const districts = useMemo(
    () => Array.from(new Set(facilityList.map((f) => f.district))).sort(),
    [facilityList],
  );

  const eriByFacility = useMemo(() => {
    if (!thresholds) return new Map<string, ReturnType<typeof computeEri>>();
    const map = new Map<string, ReturnType<typeof computeEri>>();
    for (const f of facilityList) {
      const fEvents = events.filter((e: any) => e.facility_id === f.id);
      map.set(f.id, computeEri(fEvents, new Date(), thresholds));
    }
    return map;
  }, [facilityList, events, thresholds]);

  const filtered = useMemo(() => {
    return facilityList.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== ALL && f.type !== typeFilter) return false;
      if (districtFilter !== ALL && f.district !== districtFilter) return false;
      if (serviceFilter !== ALL) {
        const registered = facilityServiceList.some(
          (fs) => fs.facility_id === f.id && fs.service_id === serviceFilter && fs.is_registered,
        );
        if (!registered) return false;
      }
      if (availabilityFilter !== ALL) {
        const breakdown = eriByFacility.get(f.id);
        if (!breakdown) return false;
        if (availabilityFilter === "HIGH" && breakdown.eri < 0.6) return false;
        if (availabilityFilter === "MODERATE" && (breakdown.eri < 0.3 || breakdown.eri >= 0.6)) return false;
        if (availabilityFilter === "LOW" && breakdown.eri >= 0.3) return false;
      }
      return true;
    });
  }, [facilityList, search, typeFilter, districtFilter, serviceFilter, availabilityFilter, facilityServiceList, eriByFacility]);

  const isLoading = facilities.isLoading || services.isLoading || facilityServices.isLoading || evidence.isLoading;
  const isError = facilities.isError || services.isError || facilityServices.isError || evidence.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities"
        subtitle="Directory of registered facilities with current, evidence-based reliability — not just registration status."
      />

      <Section bodyClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" title="Search & filters">
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-xs"
              placeholder="Name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <FilterSelect label="Service" value={serviceFilter} onChange={setServiceFilter}>
          {serviceList.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Facility type" value={typeFilter} onChange={setTypeFilter}>
          {FACILITY_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{humanise(t)}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="District" value={districtFilter} onChange={setDistrictFilter}>
          {districts.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect label="Current reliability" value={availabilityFilter} onChange={setAvailabilityFilter}>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="MODERATE">Moderate</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </FilterSelect>
      </Section>

      <Section title="Facilities" description={`${filtered.length} of ${facilityList.length} facilities`}>
        {isLoading ? (
          <SkeletonRows rows={8} />
        ) : isError ? (
          <ErrorState message="Could not load facilities" retry={() => facilities.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No facilities match these filters" body="Try widening your search or filters." />
        ) : (
          <DataTable head={["Facility", "Type", "District", "Registered services", "Current reliability", "Last evidence"]}>
            {filtered.map((f) => {
              const breakdown = eriByFacility.get(f.id);
              const registeredCount = facilityServiceList.filter((fs) => fs.facility_id === f.id && fs.is_registered).length;
              return (
                <Tr key={f.id} onClick={() => setSelectedFacility(f)}>
                  <Td className="max-w-[14rem]">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.code}</p>
                  </Td>
                  <Td><StatusPill tone="info" dot={false}>{humanise(f.type)}</StatusPill></Td>
                  <Td className="text-xs text-muted-foreground">{f.district}</Td>
                  <Td className="text-xs tabular-nums">{registeredCount}</Td>
                  <Td>{breakdown ? <EriBadge value={breakdown.eri} /> : <StatusPill tone="neutral">No evidence</StatusPill>}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {breakdown?.latestObservedAt ? formatAge(ageMinutes(breakdown.latestObservedAt)) : "—"}
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        )}
      </Section>

      <FacilityDetailSheet
        facility={selectedFacility}
        services={serviceList}
        facilityServices={facilityServiceList}
        onOpenChange={(open) => !open && setSelectedFacility(null)}
      />
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
