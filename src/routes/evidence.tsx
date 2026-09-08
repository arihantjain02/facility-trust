import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listEvidence, submitEvidence } from "@/lib/api/evidence.functions";
import { listFacilities, listServices } from "@/lib/api/core.functions";
import { enqueue, readQueue, remove } from "@/lib/offline-queue";
import { Button } from "@/components/ui/button";
import { FreshnessTag } from "@/components/eri-badge";

export const Route = createFileRoute("/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence ledger — RELI-REF" },
      { name: "description", content: "Append-only ledger of service availability reports with duplicate and conflict checks." },
      { property: "og:title", content: "Evidence ledger — RELI-REF" },
      { property: "og:description", content: "Append-only ledger of service availability reports with duplicate and conflict checks." },
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

function EvidencePage() {
  const qc = useQueryClient();
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const ledger = useQuery({ queryKey: ["evidence"], queryFn: () => listEvidence({ data: {} }) });
  const [facility, setFacility] = useState("");
  const [service, setService] = useState("");
  const [observation, setObservation] = useState("AVAILABLE");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [queued, setQueued] = useState(readQueue());

  const submit = async () => {
    const payload = { facility_id: facility, service_id: service, observation, notes: notes || null };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue(payload);
      setQueued(readQueue());
      setStatus("You are offline — the report is queued and will sync later.");
      return;
    }
    try {
      const res = await submitEvidence({ data: payload as any });
      setStatus(
        res.duplicate
          ? "Recorded and flagged as a duplicate of an existing report."
          : `Recorded. Reliability for this service is now ${Math.round(res.breakdown.eri * 100)}%${res.conflicts ? `, ${res.conflicts} conflict flagged` : ""}.`,
      );
      setNotes("");
      qc.invalidateQueries({ queryKey: ["evidence"] });
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const syncQueue = async () => {
    for (const item of readQueue()) {
      try {
        await submitEvidence({ data: { ...(item.payload as any), source: "OFFLINE_SYNC" } });
        remove(item.id);
      } catch {
        break;
      }
    }
    setQueued(readQueue());
    qc.invalidateQueries({ queryKey: ["evidence"] });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Evidence ledger</h1>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={facility} onChange={(e) => setFacility(e.target.value)}>
          <option value="">Facility…</option>
          {(facilities.data ?? []).map((f: any) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Service…</option>
          {(services.data ?? []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={observation} onChange={(e) => setObservation(e.target.value)}>
          <option value="AVAILABLE">Available now</option>
          <option value="UNAVAILABLE">Not available</option>
          <option value="TEMPORARILY_BLOCKED">Temporarily blocked</option>
        </select>
        <input className="rounded border border-input bg-background px-3 py-2 text-sm" placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={submit} disabled={!facility || !service}>Record report</Button>
        {status && <p className="md:col-span-5 text-sm text-muted-foreground">{status}</p>}
        {queued.length > 0 && (
          <p className="md:col-span-5 flex items-center gap-3 text-sm">
            {queued.length} report(s) waiting to sync
            <Button size="sm" variant="outline" onClick={syncQueue}>Sync now</Button>
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2">Facility</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Report</th>
              <th className="px-3 py-2">Observed</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {(ledger.data?.events ?? []).slice(0, 120).map((e: any) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2">{e.facilities?.name}</td>
                <td className="px-3 py-2">{e.services?.name}</td>
                <td className="px-3 py-2 capitalize">{e.observation.replace("_", " ").toLowerCase()}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(e.observed_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.source.replace("_", " ").toLowerCase()}</td>
                <td className="px-3 py-2 space-x-1">
                  {e.is_duplicate && <FreshnessTag band="duplicate" />}
                  {e.in_conflict && <FreshnessTag band="conflict" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
