/**
 * Shared evidence / ranking presentation for the referral creation flow.
 * Renders RankedCandidate objects (from rankFacilitiesForService) with full
 * ERI transparency: S/Q/C meters, freshness, reasons, and a "why" explainer.
 */
import { useState } from "react";
import { Info, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EriBadge, EriDial, FreshnessTag } from "@/components/eri-badge";
import { Meter, StatusPill, humanise } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export function WhyScoreDialog({ candidate }: { candidate: any }) {
  const [open, setOpen] = useState(false);
  const b = candidate.breakdown;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Info className="size-3.5" /> Why this score?
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{candidate.facility.name}</DialogTitle>
          <DialogDescription>ERI = Support × Sufficiency × Consistency</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <EriDial value={b.eri} />
          <div className="space-y-3 rounded-md border border-border bg-surface-sunken p-3">
            <Meter label={`Support (S) — ${b.S.toFixed(2)}`} value={b.S} tone="info" />
            <Meter label={`Sufficiency (Q) — ${b.Q.toFixed(2)}`} value={b.Q} tone="info" />
            <Meter label={`Consistency (C) — ${b.C.toFixed(2)}`} value={b.C} tone="info" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              In plain language
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {b.reasons.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            This score reflects reported evidence only. It is not a guarantee of availability.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Full evidence-check row used in Step 2 — every candidate, eligible or not. */
export function EvidenceCheckCard({ candidate }: { candidate: any }) {
  const b = candidate.breakdown;
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-4 shadow-[var(--shadow-card)]",
        candidate.eligible ? "border-border" : "border-dashed border-border opacity-80",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{candidate.facility.name}</p>
          <p className="text-xs text-muted-foreground">
            {candidate.facility.type} · {candidate.facility.district} · {candidate.distanceKm} km
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {!candidate.eligible && (
            <StatusPill tone="danger">
              <ShieldAlert className="size-3" /> Excluded
            </StatusPill>
          )}
          {b.conflictCount > 0 && <StatusPill tone="warn">Conflict</StatusPill>}
          <FreshnessTag band={b.freshness} />
          <EriBadge value={b.eri} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <EriDial value={b.eri} />
        <div className="grid gap-2 sm:grid-cols-3">
          <Meter label="Support (S)" value={b.S} tone="info" />
          <Meter label="Sufficiency (Q)" value={b.Q} tone="info" />
          <Meter label="Consistency (C)" value={b.C} tone="info" />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Last observed</dt>
          <dd className="font-medium">{b.latestObservedAt ? new Date(b.latestObservedAt).toLocaleString() : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Evidence count</dt>
          <dd className="font-medium">{b.usedCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Current status</dt>
          <dd className="font-medium">{humanise(b.latestObservation)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Distance</dt>
          <dd className="font-medium">{candidate.distanceKm} km</dd>
        </div>
      </dl>

      {candidate.excludedReason && (
        <p className="mt-3 rounded-sm bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
          {candidate.excludedReason}
        </p>
      )}

      <div className="mt-3">
        <WhyScoreDialog candidate={candidate} />
      </div>
    </div>
  );
}

/** Ranked recommendation card used in Step 3. */
export function RankedCandidateCard({
  candidate,
  selected,
  compareChecked,
  onCompareToggle,
  onSelect,
  onViewEvidence,
}: {
  candidate: any;
  selected: boolean;
  compareChecked: boolean;
  onCompareToggle: (checked: boolean) => void;
  onSelect: () => void;
  onViewEvidence: () => void;
}) {
  const b = candidate.breakdown;
  const top = candidate.rank === 1;
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-4 shadow-[var(--shadow-card)]",
        top ? "border-accent ring-1 ring-accent/40" : "border-border",
        selected && "border-primary ring-1 ring-primary/40",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-semibold">
            {candidate.rank}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{candidate.facility.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {candidate.distanceKm} km · {candidate.facility.type}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {top && (
            <StatusPill tone="ok">
              <Sparkles className="size-3" /> Recommended
            </StatusPill>
          )}
          <FreshnessTag band={b.freshness} />
          <EriBadge value={b.eri} />
        </div>
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {candidate.why.slice(0, 4).map((w: string, i: number) => (
          <li key={i}>{w}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={compareChecked} onCheckedChange={(v) => onCompareToggle(Boolean(v))} />
          Compare
        </label>
        <Button type="button" variant="outline" size="sm" onClick={onViewEvidence}>
          View evidence
        </Button>
        <WhyScoreDialog candidate={candidate} />
        <Button type="button" size="sm" className="ml-auto" onClick={onSelect}>
          {selected ? "Selected" : "Select facility"}
        </Button>
      </div>
    </div>
  );
}

export function CompareDialog({
  open,
  onOpenChange,
  candidates,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: any[];
}) {
  const rows: { label: string; get: (c: any) => string }[] = [
    { label: "Facility", get: (c) => c.facility.name },
    { label: "Eligibility", get: (c) => (c.eligible ? "Eligible" : c.excludedReason ?? "Excluded") },
    { label: "ERI", get: (c) => c.breakdown.eri.toFixed(2) },
    { label: "Support (S)", get: (c) => c.breakdown.S.toFixed(2) },
    { label: "Sufficiency (Q)", get: (c) => c.breakdown.Q.toFixed(2) },
    { label: "Consistency (C)", get: (c) => c.breakdown.C.toFixed(2) },
    { label: "Evidence age", get: (c) => humanise(c.breakdown.freshness) },
    { label: "Evidence count", get: (c) => String(c.breakdown.usedCount) },
    { label: "Distance", get: (c) => `${c.distanceKm} km` },
    { label: "Current status", get: (c) => humanise(c.breakdown.latestObservation) },
    { label: "Conflict", get: (c) => (c.breakdown.conflictCount > 0 ? "Yes" : "No") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare facilities</DialogTitle>
          <DialogDescription>Differences are highlighted.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-2 py-2 text-xs font-semibold uppercase text-muted-foreground">Attribute</th>
                {candidates.map((c) => (
                  <th key={c.facility.id} className="px-2 py-2 text-xs font-semibold">
                    {c.facility.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const values = candidates.map((c) => row.get(c));
                const differs = new Set(values).size > 1;
                return (
                  <tr key={row.label}>
                    <td className="px-2 py-2 text-xs font-medium text-muted-foreground">{row.label}</td>
                    {values.map((v, i) => (
                      <td
                        key={i}
                        className={cn("px-2 py-2", differs && "bg-warn-soft font-medium")}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
