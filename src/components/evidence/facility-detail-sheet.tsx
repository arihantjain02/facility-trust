import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EriBadge } from "@/components/eri-badge";
import { Meter, StatusPill, humanise, DataTable, Tr, Td, SkeletonRows, EmptyState } from "@/components/ui-kit";
import { listEvidence } from "@/lib/api/evidence.functions";
import { listReferrals } from "@/lib/api/referrals.functions";
import { computeEri } from "@/lib/evidence-engine/scoring";
import { formatAge, ageMinutes } from "@/lib/evidence-engine/freshness";
import type { EvidenceEvent } from "@/lib/evidence-engine/models";

interface FacilityRow {
  id: string;
  name: string;
  code: string;
  type: string;
  district: string;
  is_active: boolean;
}
interface ServiceRow { id: string; name: string; code: string }
interface FacilityServiceRow {
  facility_id: string;
  service_id: string;
  is_registered: boolean;
  is_blocked: boolean;
  blocked_reason?: string | null;
}

export function FacilityDetailSheet({
  facility,
  services,
  facilityServices,
  onOpenChange,
}: {
  facility: FacilityRow | null;
  services: ServiceRow[];
  facilityServices: FacilityServiceRow[];
  onOpenChange: (open: boolean) => void;
}) {
  const evidence = useQuery({
    queryKey: ["evidence", "facility", facility?.id],
    queryFn: () => listEvidence({ data: { facility_id: facility!.id, limit: 300 } }),
    enabled: !!facility,
  });
  const referrals = useQuery({
    queryKey: ["referrals", "for-facility-detail"],
    queryFn: () => listReferrals(),
    enabled: !!facility,
  });

  const registrations = facility
    ? facilityServices.filter((fs) => fs.facility_id === facility.id)
    : [];

  const events = (evidence.data?.events ?? []) as EvidenceEvent[];
  const thresholds = evidence.data?.thresholds;

  const facilityReferrals = facility
    ? ((referrals.data ?? []) as any[]).filter((r) => r.destination_facility_id === facility.id)
    : [];
  const settled = facilityReferrals.filter((r) =>
    ["SERVICE_PROVIDED", "SERVICE_UNAVAILABLE"].includes(r.status),
  );
  const provided = facilityReferrals.filter((r) => r.status === "SERVICE_PROVIDED").length;

  return (
    <Sheet open={!!facility} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {facility && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{facility.name}</SheetTitle>
              <SheetDescription>
                {facility.code} · {humanise(facility.type)} · {facility.district}
                {!facility.is_active && (
                  <span className="ml-2"><StatusPill tone="neutral">Inactive</StatusPill></span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  Services — registered vs. currently reported
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registration means the facility is listed to offer a service. It is not proof the
                  service is available right now — only recent evidence shows that.
                </p>
                {evidence.isLoading ? (
                  <SkeletonRows rows={3} className="mt-3" />
                ) : registrations.length === 0 ? (
                  <EmptyState title="No services registered" body="This facility has no registered services yet." />
                ) : (
                  <div className="mt-3 space-y-3">
                    {registrations.map((reg) => {
                      const service = services.find((s) => s.id === reg.service_id);
                      const svcEvents = events.filter((e) => e.service_id === reg.service_id);
                      const breakdown = thresholds
                        ? computeEri(svcEvents, new Date(), thresholds)
                        : null;
                      return (
                        <div key={reg.service_id} className="rounded-md border border-border p-3">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{service?.name ?? "Service"}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <StatusPill tone={reg.is_registered ? "info" : "neutral"} dot={false}>
                                  {reg.is_registered ? "Registered" : "Not registered"}
                                </StatusPill>
                                {reg.is_blocked && (
                                  <StatusPill tone="danger">Currently blocked{reg.blocked_reason ? `: ${reg.blocked_reason}` : ""}</StatusPill>
                                )}
                              </div>
                            </div>
                            {breakdown && <EriBadge value={breakdown.eri} />}
                          </div>
                          {breakdown && (
                            <div className="mt-3 grid grid-cols-3 gap-3">
                              <Meter label="Support (S)" value={breakdown.S} />
                              <Meter label="Sufficiency (Q)" value={breakdown.Q} />
                              <Meter label="Consistency (C)" value={breakdown.C} />
                            </div>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {breakdown && breakdown.usedCount > 0
                              ? `Last observed ${formatAge(ageMinutes(breakdown.latestObservedAt!))}, based on ${breakdown.usedCount} evidence event(s).`
                              : "No recent evidence — currently reported availability is unknown despite registration."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  Recent evidence
                </h3>
                {evidence.isLoading ? (
                  <SkeletonRows rows={4} className="mt-2" />
                ) : events.length === 0 ? (
                  <EmptyState title="No evidence recorded yet" />
                ) : (
                  <DataTable head={["Time", "Service", "Observation", "Source"]} className="mt-2">
                    {events.slice(0, 20).map((e: any) => (
                      <Tr key={e.id}>
                        <Td className="whitespace-nowrap font-mono text-xs">{new Date(e.observed_at).toLocaleString()}</Td>
                        <Td className="max-w-[8rem] truncate">{services.find((s) => s.id === e.service_id)?.name ?? "—"}</Td>
                        <Td>{humanise(e.observation)}</Td>
                        <Td className="text-xs text-muted-foreground">{humanise(e.source)}</Td>
                      </Tr>
                    ))}
                  </DataTable>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  Referral performance
                </h3>
                {referrals.isLoading ? (
                  <SkeletonRows rows={2} className="mt-2" />
                ) : facilityReferrals.length === 0 ? (
                  <EmptyState title="No referrals recorded to this facility yet" />
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Total referrals</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{facilityReferrals.length}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Service provided</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{provided}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Success rate</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {settled.length ? `${Math.round((provided / settled.length) * 100)}%` : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
