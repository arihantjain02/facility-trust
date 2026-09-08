import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listFacilities, listServices } from "@/lib/api/core.functions";
import {
  createReferral,
  listReferrals,
  rankFacilitiesForService,
  recordReferralOutcome,
  updateReferralStatus,
  verifyReferralToken,
} from "@/lib/api/referrals.functions";
import { Button } from "@/components/ui/button";
import { EriBadge, FreshnessTag } from "@/components/eri-badge";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — RELI-REF" },
      { name: "description", content: "Create evidence-ranked referrals, verify arrivals and record outcomes." },
      { property: "og:title", content: "Referrals — RELI-REF" },
      { property: "og:description", content: "Create evidence-ranked referrals, verify arrivals and record outcomes." },
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

function Referrals() {
  const qc = useQueryClient();
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const referrals = useQuery({ queryKey: ["referrals"], queryFn: () => listReferrals() });

  const [origin, setOrigin] = useState("");
  const [service, setService] = useState("");
  const [patient, setPatient] = useState("PT-2026-0001");
  const [urgency, setUrgency] = useState("ROUTINE");
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [ranking, setRanking] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState<any>(null);

  const rank = async () => {
    setStatus(null);
    const res = await rankFacilitiesForService({
      data: { origin_facility_id: origin, service_id: service, max_distance_km: maxKm === "" ? null : Number(maxKm) },
    });
    setRanking(res);
  };

  const choose = async (c: any) => {
    try {
      const row = await createReferral({
        data: {
          patient_ref: patient,
          origin_facility_id: origin,
          destination_facility_id: c.facility.id,
          service_id: service,
          urgency,
          max_distance_km: maxKm === "" ? null : Number(maxKm),
          notes: null,
          selected_eri: c.breakdown.eri,
          selected_distance_km: c.distanceKm,
          evidence_snapshot: { why: c.why, breakdown: c.breakdown },
        } as any,
      });
      setStatus(`Referral ${row?.referral_code} created. Share token: ${row?.token}`);
      setRanking(null);
      qc.invalidateQueries({ queryKey: ["referrals"] });
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">New referral</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <input className="rounded border border-input bg-background px-3 py-2 text-sm" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Patient reference" />
          <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Referring facility…</option>
            {(facilities.data ?? []).map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Service needed…</option>
            {(services.data ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
          <input className="rounded border border-input bg-background px-3 py-2 text-sm" type="number" placeholder="Max km" value={maxKm} onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))} />
          <Button onClick={rank} disabled={!origin || !service}>Rank options</Button>
        </div>
        {status && <p className="mt-3 text-sm text-muted-foreground">{status}</p>}
      </section>

      {ranking && (
        <section className="space-y-3">
          <h2 className="font-medium">Ranked options — evidence first, then travel</h2>
          {ranking.ranked.map((c: any) => (
            <div key={c.facility.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">#{c.rank}</span>
                <span className="font-medium">{c.facility.name}</span>
                <span className="text-sm text-muted-foreground">{c.facility.type} · {c.distanceKm} km</span>
                <EriBadge value={c.breakdown.eri} />
                <FreshnessTag band={c.breakdown.freshness} />
                <Button size="sm" className="ml-auto" onClick={() => choose(c)}>Refer here</Button>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {c.why.slice(0, 4).map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ))}
          {ranking.excluded.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Removed from consideration</p>
              <ul className="mt-2 list-disc pl-5">
                {ranking.excluded.map((c: any) => (
                  <li key={c.facility.id}>{c.facility.name} — {c.excludedReason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">Verify an arriving referral</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <input className="rounded border border-input bg-background px-3 py-2 text-sm" placeholder="Referral token" value={token} onChange={(e) => setToken(e.target.value)} />
          <Button variant="outline" onClick={async () => setVerified(await verifyReferralToken({ data: { token } }))}>Verify</Button>
        </div>
        {verified && (
          <p className="mt-3 text-sm">
            {verified.valid
              ? `Valid: ${verified.referral.referral_code} · ${verified.referral.services?.name} · status ${verified.referral.status.toLowerCase()}`
              : "No referral matches that token."}
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Update</th>
            </tr>
          </thead>
          <tbody>
            {(referrals.data ?? []).slice(0, 60).map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.referral_code}</td>
                <td className="px-3 py-2">{r.origin?.name}</td>
                <td className="px-3 py-2">{r.destination?.name}</td>
                <td className="px-3 py-2">{r.services?.name}</td>
                <td className="px-3 py-2 capitalize">{r.status.replace("_", " ").toLowerCase()}</td>
                <td className="space-x-2 px-3 py-2">
                  {["CREATED", "ACCEPTED", "ARRIVED"].includes(r.status) && (
                    <>
                      <button
                        className="text-xs underline"
                        onClick={async () => {
                          const next = r.status === "CREATED" ? "ACCEPTED" : "ARRIVED";
                          await updateReferralStatus({ data: { id: r.id, status: next as any, note: null } });
                          qc.invalidateQueries({ queryKey: ["referrals"] });
                        }}
                      >
                        {r.status === "CREATED" ? "Accept" : "Mark arrived"}
                      </button>
                      <button
                        className="text-xs underline"
                        onClick={async () => {
                          await recordReferralOutcome({ data: { id: r.id, outcome: "SERVICE_PROVIDED", notes: null } });
                          qc.invalidateQueries({ queryKey: ["referrals"] });
                        }}
                      >
                        Service provided
                      </button>
                      <button
                        className="text-xs underline"
                        onClick={async () => {
                          await recordReferralOutcome({ data: { id: r.id, outcome: "SERVICE_UNAVAILABLE", notes: null } });
                          qc.invalidateQueries({ queryKey: ["referrals"] });
                        }}
                      >
                        Not available
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
