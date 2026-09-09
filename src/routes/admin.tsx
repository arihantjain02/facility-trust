import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/useAuth";
import {
  getSettings,
  listAuditLogs,
  listFacilities,
  listFacilityServices,
  listServices,
  listUsers,
  saveFacility,
  saveService,
  saveSettings,
  setFacilityActive,
  setFacilityServiceRegistration,
} from "@/lib/api/core.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  SkeletonRows,
  StatusPill,
  Td,
  Tr,
  humanise,
} from "@/components/ui-kit";
import { ShieldOff } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — RELI-REF" },
      { name: "description", content: "Administration console: users, facilities, services, registrations, settings and audit log." },
      { property: "og:title", content: "Administration — RELI-REF" },
      { property: "og:description", content: "Administration console: users, facilities, services, registrations, settings and audit log." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <AdminPage />
      </AppShell>
    </RequireAuth>
  ),
});

function AdminPage() {
  const { roles, loading } = useAuth();
  if (loading) return <SkeletonRows rows={6} />;
  if (!roles.includes("ADMIN")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Administration" subtitle="System configuration and governance." />
        <EmptyState
          icon={<ShieldOff className="size-6" />}
          title="Restricted"
          body="Administration is available to users with the ADMIN role only. Contact your district administrator if you believe this is incorrect."
        />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Administration" subtitle="Users, facilities, services, registrations, settings and the audit trail." />
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="settings">System settings</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="facilities" className="mt-4"><FacilitiesTab /></TabsContent>
        <TabsContent value="services" className="mt-4"><ServicesTab /></TabsContent>
        <TabsContent value="registration" className="mt-4"><RegistrationTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------- users ---- */

function UsersTab() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin-users"], queryFn: () => listUsers() });
  return (
    <Section title="Users & roles" description="Read-only — role changes are not exposed in this console">
      {isError ? (
        <ErrorState message="Could not load users." retry={() => void refetch()} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <DataTable head={["Name", "Email", "Roles", "Last login"]}>
          {(data ?? []).map((u: any) => (
            <Tr key={u.id}>
              <Td className="font-medium">{u.full_name ?? "—"}</Td>
              <Td className="text-muted-foreground">{u.email}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {(u.roles ?? []).length === 0 ? (
                    <span className="text-muted-foreground">No role</span>
                  ) : (
                    u.roles.map((r: string) => (
                      <StatusPill key={r} tone="info">{humanise(r)}</StatusPill>
                    ))
                  )}
                </div>
              </Td>
              <Td className="text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </Section>
  );
}

/* --------------------------------------------------------- facilities ---- */

const FACILITY_TYPES = ["PHC", "CHC", "DISTRICT_HOSPITAL"] as const;

function FacilitiesTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "PHC" as (typeof FACILITY_TYPES)[number],
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    contact: "",
  });

  const save = useMutation({
    mutationFn: () =>
      saveFacility({
        data: {
          ...(editing ? { id: editing.id } : {}),
          code: form.code,
          name: form.name,
          type: form.type,
          district: form.district,
          address: form.address || null,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          contact: form.contact || null,
          is_active: editing?.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Facility updated" : "Facility created");
      qc.invalidateQueries({ queryKey: ["facilities"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => setFacilityActive({ data: v }),
    onSuccess: () => {
      toast.success("Facility status updated");
      qc.invalidateQueries({ queryKey: ["facilities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", type: "PHC", district: "", address: "", latitude: "", longitude: "", contact: "" });
    setOpen(true);
  };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({
      code: f.code,
      name: f.name,
      type: f.type,
      district: f.district,
      address: f.address ?? "",
      latitude: String(f.latitude),
      longitude: String(f.longitude),
      contact: f.contact ?? "",
    });
    setOpen(true);
  };

  return (
    <Section
      title="Facilities"
      description="Create, edit and activate or deactivate facilities"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>New facility</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit facility" : "New facility"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FACILITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{humanise(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input type="number" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input type="number" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.code || !form.name || !form.district || !form.latitude || !form.longitude}
              >
                {save.isPending ? "Saving…" : "Save facility"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isError ? (
        <ErrorState message="Could not load facilities." retry={() => void refetch()} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No facilities yet" />
      ) : (
        <DataTable head={["Facility", "Type", "District", "Status", "Actions"]}>
          {(data ?? []).map((f: any) => (
            <Tr key={f.id}>
              <Td className="min-w-0">
                <span className="block truncate font-medium">{f.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{f.code}</span>
              </Td>
              <Td>{humanise(f.type)}</Td>
              <Td className="text-muted-foreground">{f.district}</Td>
              <Td>
                <StatusPill tone={f.is_active ? "ok" : "neutral"}>{f.is_active ? "Active" : "Inactive"}</StatusPill>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(f)}>Edit</Button>
                  <Button
                    size="sm"
                    variant={f.is_active ? "outline" : "default"}
                    onClick={() => toggleActive.mutate({ id: f.id, is_active: !f.is_active })}
                    disabled={toggleActive.isPending}
                  >
                    {f.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------ services ---- */

function ServicesTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", is_active: true });

  const save = useMutation({
    mutationFn: () =>
      saveService({
        data: {
          ...(editing ? { id: editing.id } : {}),
          code: form.code,
          name: form.name,
          description: form.description || null,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "Service updated" : "Service created");
      qc.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", description: "", is_active: true });
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ code: s.code, name: s.name, description: s.description ?? "", is_active: s.is_active });
    setOpen(true);
  };

  return (
    <Section
      title="Services"
      description="Create and edit the services facilities can be registered for"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>New service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.code || !form.name}>
                {save.isPending ? "Saving…" : "Save service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isError ? (
        <ErrorState message="Could not load services." retry={() => void refetch()} />
      ) : isLoading ? (
        <SkeletonRows rows={5} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No services yet" />
      ) : (
        <DataTable head={["Service", "Description", "Status", "Actions"]}>
          {(data ?? []).map((s: any) => (
            <Tr key={s.id}>
              <Td className="min-w-0">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.code}</span>
              </Td>
              <Td className="text-muted-foreground">{s.description ?? "—"}</Td>
              <Td><StatusPill tone={s.is_active ? "ok" : "neutral"}>{s.is_active ? "Active" : "Inactive"}</StatusPill></Td>
              <Td><Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button></Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </Section>
  );
}

/* ------------------------------------------------------- registration ---- */

function RegistrationTab() {
  const qc = useQueryClient();
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const links = useQuery({ queryKey: ["facility-services"], queryFn: () => listFacilityServices() });
  const [facilityId, setFacilityId] = useState<string>("");

  const toggle = useMutation({
    mutationFn: (v: { service_id: string; is_registered: boolean }) =>
      setFacilityServiceRegistration({
        data: { facility_id: facilityId, service_id: v.service_id, is_registered: v.is_registered, is_blocked: false },
      }),
    onSuccess: () => {
      toast.success("Registration updated");
      qc.invalidateQueries({ queryKey: ["facility-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isLoading = facilities.isLoading || services.isLoading || links.isLoading;
  const isError = facilities.isError || services.isError || links.isError;
  const facilityLinks = (links.data ?? []).filter((l: any) => l.facility_id === facilityId);

  return (
    <Section title="Facility ↔ service registration" description="Toggle which services a facility is registered to provide">
      {isError ? (
        <ErrorState message="Could not load registration data." />
      ) : isLoading ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label>Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a facility…" /></SelectTrigger>
              <SelectContent>
                {(facilities.data ?? []).map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!facilityId ? (
            <EmptyState title="Select a facility" body="Choose a facility above to manage its registered services." />
          ) : (data.services ?? services.data ?? []).length === 0 ? (
            <EmptyState title="No services defined" />
          ) : (
            <DataTable head={["Service", "Registered"]}>
              {(services.data ?? []).map((s: any) => {
                const link = facilityLinks.find((l: any) => l.service_id === s.id);
                const registered = !!link?.is_registered;
                return (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td>
                      <Switch
                        checked={registered}
                        onCheckedChange={(v) => toggle.mutate({ service_id: s.id, is_registered: v })}
                        disabled={toggle.isPending}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </DataTable>
          )}
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------ settings ---- */

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const [form, setForm] = useState<null | {
    very_fresh_min: number;
    fresh_min: number;
    aging_min: number;
    eri: number;
    distance: number;
    distance_normalizer_km: number;
  }>(null);

  const active = form ?? (data
    ? {
        very_fresh_min: data.thresholds.very_fresh_min,
        fresh_min: data.thresholds.fresh_min,
        aging_min: data.thresholds.aging_min,
        eri: data.weights.eri,
        distance: data.weights.distance,
        distance_normalizer_km: data.weights.distance_normalizer_km,
      }
    : null);

  const save = useMutation({
    mutationFn: () => {
      if (!active) throw new Error("Nothing to save");
      return saveSettings({
        data: {
          thresholds: {
            very_fresh_min: active.very_fresh_min,
            fresh_min: active.fresh_min,
            aging_min: active.aging_min,
          },
          weights: {
            eri: active.eri,
            distance: active.distance,
            distance_normalizer_km: active.distance_normalizer_km,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
      setForm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section title="System settings" description="Freshness thresholds and ranking weights used by the evidence engine">
      {isError ? (
        <ErrorState message="Could not load settings." />
      ) : isLoading || !active ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Evidence freshness thresholds (minutes)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Controls how quickly a reported observation is treated as "very fresh", "fresh", "aging" or "stale".
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Very fresh under (min)</Label>
                <Input type="number" min={1} max={1440} value={active.very_fresh_min}
                  onChange={(e) => setForm({ ...active, very_fresh_min: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fresh under (min)</Label>
                <Input type="number" min={2} max={2880} value={active.fresh_min}
                  onChange={(e) => setForm({ ...active, fresh_min: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Aging under (min)</Label>
                <Input type="number" min={3} max={10080} value={active.aging_min}
                  onChange={(e) => setForm({ ...active, aging_min: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Ranking weights</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Controls how strongly evidence reliability (ERI) versus travel distance influence facility ranking.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Evidence weight (0–1)</Label>
                <Input type="number" step="0.05" min={0} max={1} value={active.eri}
                  onChange={(e) => setForm({ ...active, eri: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Distance weight (0–1)</Label>
                <Input type="number" step="0.05" min={0} max={1} value={active.distance}
                  onChange={(e) => setForm({ ...active, distance: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Distance normaliser (km)</Label>
                <Input type="number" min={1} max={500} value={active.distance_normalizer_km}
                  onChange={(e) => setForm({ ...active, distance_normalizer_km: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </Section>
  );
}

/* --------------------------------------------------------------- audit ---- */

function AuditTab() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["audit-logs"], queryFn: () => listAuditLogs() });
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const rows = data ?? [];
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <Section
      title="Audit log"
      description={`${rows.length} recorded event(s), most recent first`}
      actions={
        <div className="flex items-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      }
    >
      {isError ? (
        <ErrorState message="Could not load audit log." retry={() => void refetch()} />
      ) : isLoading ? (
        <SkeletonRows rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit events recorded yet" />
      ) : (
        <DataTable head={["When", "Actor", "Action", "Resource", "Result"]}>
          {pageRows.map((a: any) => (
            <Tr key={a.id}>
              <Td className="whitespace-nowrap text-muted-foreground">{new Date(a.created_at).toLocaleString()}</Td>
              <Td className="min-w-0 truncate">{a.actor_email ?? "System"}</Td>
              <Td>{humanise(a.action)}</Td>
              <Td className="text-muted-foreground">{a.resource}{a.resource_id ? ` · ${String(a.resource_id).slice(0, 8)}` : ""}</Td>
              <Td>
                <StatusPill tone={a.result === "SUCCESS" ? "ok" : "danger"}>{humanise(a.result ?? "SUCCESS")}</StatusPill>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </Section>
  );
}
