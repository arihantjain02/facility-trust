import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Loader2, MapPinned, StickyNote, User } from "lucide-react";
import QRCode from "qrcode";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SafetyNote,
  Section,
  SkeletonRows,
} from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listFacilities, listServices } from "@/lib/api/core.functions";
import { createReferral, rankFacilitiesForService } from "@/lib/api/referrals.functions";
import {
  CompareDialog,
  EvidenceCheckCard,
  RankedCandidateCard,
} from "@/components/referrals/candidate-panel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals/new")({
  head: () => ({
    meta: [
      { title: "Create referral — RELI-REF" },
      { name: "description", content: "Create an evidence-ranked referral in five guided steps." },
      { property: "og:title", content: "Create referral — RELI-REF" },
      { property: "og:description", content: "Create an evidence-ranked referral in five guided steps." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <NewReferralPage />
      </AppShell>
    </RequireAuth>
  ),
});

const STEPS = [
  { n: 1, label: "Referral details" },
  { n: 2, label: "Evidence check" },
  { n: 3, label: "Facility ranking" },
  { n: 4, label: "Review" },
  { n: 5, label: "Referral created" },
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-0">
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n} className="flex items-center sm:flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums",
                  done && "border-ok bg-ok text-ok-foreground",
                  active && !done && "border-primary bg-primary text-primary-foreground",
                  !active && !done && "border-border bg-surface-sunken text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : s.n}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {String(s.n).padStart(2, "0")} · {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 hidden h-px flex-1 sm:block",
                  done ? "bg-ok" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type Urgency = "ROUTINE" | "URGENT" | "EMERGENCY";

function NewReferralPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const facilities = useQuery({ queryKey: ["facilities"], queryFn: () => listFacilities() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });

  const [step, setStep] = useState(1);

  // step 1 fields
  const [patientRef, setPatientRef] = useState("");
  const [originId, setOriginId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("ROUTINE");
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const [ranking, setRanking] = useState<any>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankLoading, setRankLoading] = useState(false);

  const [selected, setSelected] = useState<any>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const step1Valid = patientRef.trim().length >= 3 && originId !== "" && serviceId !== "";

  const runEvidenceCheck = async () => {
    setRankError(null);
    setRankLoading(true);
    try {
      const res = await rankFacilitiesForService({
        data: {
          origin_facility_id: originId,
          service_id: serviceId,
          max_distance_km: maxKm === "" ? null : Number(maxKm),
        },
      });
      setRanking(res);
      setStep(2);
    } catch (e) {
      setRankError((e as Error).message);
    } finally {
      setRankLoading(false);
    }
  };

  const allCandidates = useMemo(() => {
    if (!ranking) return [];
    return [...ranking.ranked, ...ranking.excluded].sort((a, b) => a.rank - b.rank || 0);
  }, [ranking]);

  const compareCandidates = useMemo(() => {
    if (!ranking) return [];
    return allCandidates.filter((c: any) => compareIds.includes(c.facility.id));
  }, [allCandidates, compareIds, ranking]);

  const submitReferral = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const row = await createReferral({
        data: {
          patient_ref: patientRef,
          origin_facility_id: originId,
          destination_facility_id: selected.facility.id,
          service_id: serviceId,
          urgency,
          max_distance_km: maxKm === "" ? null : Number(maxKm),
          notes: notes.trim() === "" ? null : notes.trim(),
          selected_eri: selected.breakdown.eri,
          selected_distance_km: selected.distanceKm,
          evidence_snapshot: { why: selected.why, breakdown: selected.breakdown },
        } as any,
      });
      setCreated(row);
      QRCode.toDataURL(row!.token, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => {});
      qc.invalidateQueries({ queryKey: ["referrals"] });
      toast.success(`Referral ${row?.referral_code} created`);
      setStep(5);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const originFacility = (facilities.data ?? []).find((f: any) => f.id === originId);
  const serviceRow = (services.data ?? []).find((s: any) => s.id === serviceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create referral"
        subtitle="Record → Check → Summarise → Decide → Rank — a guided, evidence-first referral."
      />

      <Section bodyClassName="p-4 sm:p-5">
        <Stepper step={step} />
      </Section>

      {step === 1 && (
        <Section title="01 · Referral details" description="No sensitive medical data is collected here.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="patient-ref" className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" /> Patient reference ID
              </Label>
              <Input
                id="patient-ref"
                placeholder="e.g. PT-2026-0001"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A local reference number only — never a name or identifiable detail.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Required service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Select service…" /></SelectTrigger>
                <SelectContent>
                  {(services.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Referring facility</Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger><SelectValue placeholder="Select facility…" /></SelectTrigger>
                <SelectContent>
                  {(facilities.data ?? []).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max-km" className="flex items-center gap-1.5">
                <MapPinned className="size-3.5 text-muted-foreground" /> Preferred maximum distance (km)
              </Label>
              <Input
                id="max-km"
                type="number"
                min={1}
                placeholder="Optional"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                <StickyNote className="size-3.5 text-muted-foreground" /> Operational notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Transport arrangements, contact instructions, etc. (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={400}
              />
            </div>
          </div>

          {rankError && <ErrorState message={rankError} retry={runEvidenceCheck} />}

          <div className="mt-5 flex justify-end">
            <Button onClick={runEvidenceCheck} disabled={!step1Valid || rankLoading}>
              {rankLoading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Continue to evidence check
            </Button>
          </div>
        </Section>
      )}

      {step === 2 && ranking && (
        <Section
          title="02 · Evidence check"
          description="Review recent evidence before selecting a facility."
        >
          <div className="space-y-4">
            {allCandidates.length === 0 && (
              <EmptyState title="No candidate facilities found" body="No other facilities are registered for this service." />
            )}
            {allCandidates.map((c: any) => (
              <EvidenceCheckCard key={c.facility.id} candidate={c} />
            ))}
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={ranking.ranked.length === 0}>
              Continue to facility ranking
            </Button>
          </div>
        </Section>
      )}

      {step === 3 && ranking && (
        <Section
          title="03 · Recommended facilities"
          description="Ranked using eligibility, evidence reliability and geographic distance."
        >
          {ranking.ranked.length === 0 ? (
            <EmptyState title="No eligible facility" body="Every candidate was excluded — adjust the distance limit or service." />
          ) : (
            <div className="space-y-4">
              {ranking.ranked.map((c: any) => (
                <RankedCandidateCard
                  key={c.facility.id}
                  candidate={c}
                  selected={selected?.facility.id === c.facility.id}
                  compareChecked={compareIds.includes(c.facility.id)}
                  onCompareToggle={(checked) =>
                    setCompareIds((prev) =>
                      checked ? [...prev, c.facility.id] : prev.filter((id) => id !== c.facility.id),
                    )
                  }
                  onSelect={() => setSelected(c)}
                  onViewEvidence={() => setStep(2)}
                />
              ))}
            </div>
          )}

          {compareIds.length >= 2 && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
                Compare {compareIds.length} facilities
              </Button>
              <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} candidates={compareCandidates} />
            </div>
          )}

          {ranking.excluded.length > 0 && (
            <div className="mt-6 rounded-md border border-dashed border-border bg-surface-sunken p-4 opacity-90">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Excluded from consideration
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {ranking.excluded.map((c: any) => (
                  <li key={c.facility.id}>
                    <span className="font-medium text-foreground">{c.facility.name}</span> — {c.excludedReason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={!selected}>Continue to review</Button>
          </div>
        </Section>
      )}

      {step === 4 && selected && (
        <Section title="04 · Review" description="Confirm before the referral is recorded.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">Referral</p>
              <p>Patient reference: <span className="font-medium">{patientRef}</span></p>
              <p>Service: <span className="font-medium">{serviceRow?.name}</span></p>
              <p>Origin: <span className="font-medium">{originFacility?.name}</span></p>
              <p>Urgency: <span className="font-medium">{urgency}</span></p>
              {notes && <p>Notes: <span className="font-medium">{notes}</span></p>}
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Chosen destination
              </p>
              <p className="font-medium">{selected.facility.name}</p>
              <p>ERI at referral time: <span className="font-medium">{selected.breakdown.eri.toFixed(2)}</span></p>
              <p>Distance: <span className="font-medium">{selected.distanceKm} km</span></p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {selected.why.slice(0, 3).map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
          <SafetyNote className="mt-4" />
          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={submitReferral} disabled={creating}>
              {creating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Create referral
            </Button>
          </div>
        </Section>
      )}

      {step === 5 && created && (
        <Section title="05 · Referral created" description="Share the token with the destination facility.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Referral code
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-wide">{created.referral_code}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/referrals/$id" params={{ id: created.id }}>View referral</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(created.token);
                    toast.success("Token copied");
                  }}
                >
                  <ClipboardCopy className="mr-1.5 size-4" /> Copy token
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.navigate({ to: "/referrals" })}>
                  Back to register
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface-sunken p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Secure referral
              </p>
              {qrDataUrl && <img src={qrDataUrl} alt="Referral QR token" className="mx-auto mt-3 size-40" />}
              <p className="mt-2 font-mono text-xs text-muted-foreground break-all">{created.token}</p>
              <p className="mt-1 text-xs text-muted-foreground">Scan at destination facility</p>
            </div>
          </div>
        </Section>
      )}

      {(services.isLoading || facilities.isLoading) && step === 1 && <SkeletonRows rows={4} />}
    </div>
  );
}
