import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PlusCircle, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listFacilities, listServices } from "@/lib/api/core.functions";
import { listReferrals } from "@/lib/api/referrals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  ReferralStatusPill,
  SkeletonRows,
  Td,
  Tr,
} from "@/components/ui-kit";
import { EriBadge } from "@/components/eri-badge";

export const Route = createFileRoute("/referrals/")({
  head: () => ({
    meta: [
      { title: "Referrals — RELI-REF" },
      { name: "description", content: "Operational register of referrals, evidence-ranked and tracked end to end." },
      { property: "og:title", content: "Referrals — RELI-REF" },
      { property: "og:description", content: "Operational register of referrals, evidence-ranked and tracked end to end." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <Referrals />
      </AppShell>
    </RequireAuth>
  ),
});

const STATUS_OPTIONS = [
  "CREATED",
  "ACCEPTED",
  "ARRIVED",
  "COMPLETED",
  "SERVICE_PROVIDED",
  "SERVICE_UNAVAILABLE",
  "CANCELLED",
];

function Referrals() {
  const navigate = useNavigate();
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: () => listReferrals() });
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });

  const [status, setStatus] = useState<string>("ALL");
  const [service, setService] = useState<string>("ALL");
  const [facility, setFacility] = useState<string>("ALL");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return (referrals.data ?? []).filter((r: any) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (service !== "ALL" && r.service_id !== service) return false;
      if (
        facility !== "ALL" &&
        r.origin_facility_id !== facility &&
        r.destination_facility_id !== facility
      )
        return false;
      if (q.trim() && !r.referral_code.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [referrals.data, status, service, facility, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        subtitle="Operational register of every referral, its evidence-ranked destination and current status."
        actions={
          <Button asChild>
            <Link to="/referrals/new">
              <PlusCircle className="mr-1.5 size-4" /> New referral
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 rounded-md border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search referral code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All services</SelectItem>
            {(services.data ?? []).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={facility} onValueChange={setFacility}>
          <SelectTrigger><SelectValue placeholder="Facility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All facilities</SelectItem>
            {(facilities.data ?? []).map((f: any) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {referrals.isLoading ? (
        <SkeletonRows rows={8} />
      ) : referrals.isError ? (
        <ErrorState message={(referrals.error as Error).message} retry={() => referrals.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No referrals match these filters"
          body="Create a new referral or adjust your filters."
          action={
            <Button asChild size="sm">
              <Link to="/referrals/new">New referral</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          head={["Code", "Origin", "Destination", "Service", "Urgency", "ERI", "Status", "Created", ""]}
        >
          {rows.map((r: any) => (
            <Tr key={r.id} onClick={() => navigate({ to: "/referrals/$id", params: { id: r.id } })}>
              <Td className="font-mono text-xs font-medium">{r.referral_code}</Td>
              <Td className="max-w-[10rem] truncate">{r.origin?.name ?? "—"}</Td>
              <Td className="max-w-[10rem] truncate">{r.destination?.name ?? "—"}</Td>
              <Td className="max-w-[8rem] truncate">{r.services?.name ?? "—"}</Td>
              <Td className="text-xs capitalize">{r.urgency?.toLowerCase()}</Td>
              <Td>{typeof r.selected_eri === "number" ? <EriBadge value={r.selected_eri} /> : "—"}</Td>
              <Td><ReferralStatusPill status={r.status} /></Td>
              <Td className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </Td>
              <Td>
                <Link
                  to="/referrals/$id"
                  params={{ id: r.id }}
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </Link>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
