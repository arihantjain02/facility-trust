import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusPill, humanise, observationTone, Meter } from "@/components/ui-kit";
import { EriBadge, FreshnessTag } from "@/components/eri-badge";
import { computeEri } from "@/lib/evidence-engine/scoring";
import { ageMinutes, freshnessBand, formatAge } from "@/lib/evidence-engine/freshness";
import type { EvidenceEvent, FreshnessThresholds } from "@/lib/evidence-engine/models";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface LedgerEntry extends EvidenceEvent {
  id: string;
  in_conflict?: boolean;
  is_duplicate?: boolean | null;
  duplicate_of?: string | null;
  created_by?: string | null;
  facilities?: { name: string; code: string; type: string } | null;
  services?: { name: string; code: string } | null;
}

export function EvidenceDetailSheet({
  entry,
  allEvents,
  thresholds,
  onOpenChange,
}: {
  entry: LedgerEntry | null;
  allEvents: LedgerEntry[];
  thresholds: FreshnessThresholds;
  onOpenChange: (open: boolean) => void;
}) {
  const related = entry
    ? allEvents
        .filter((e) => e.facility_id === entry.facility_id && e.service_id === entry.service_id)
        .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
    : [];
  const breakdown = entry ? computeEri(related as EvidenceEvent[], new Date(), thresholds) : null;

  return (
    <Sheet open={!!entry} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {entry && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">
                {entry.facilities?.name ?? "Facility"} · {entry.services?.name ?? "Service"}
              </SheetTitle>
              <SheetDescription>
                Ledger entry recorded {new Date(entry.observed_at).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-6">
              <section className="grid grid-cols-2 gap-3 rounded-md border border-border bg-surface-sunken p-3 text-sm">
                <Field label="Observation">
                  <StatusPill tone={observationTone(entry.observation)}>
                    {humanise(entry.observation)}
                  </StatusPill>
                </Field>
                <Field label="Freshness">
                  <FreshnessTag band={freshnessBand(ageMinutes(entry.observed_at), thresholds)} />
                </Field>
                <Field label="Source">{humanise(entry.source)}</Field>
                <Field label="Age">{formatAge(ageMinutes(entry.observed_at))}</Field>
                <Field label="Duplicate">
                  {entry.is_duplicate ? <StatusPill tone="neutral">Duplicate</StatusPill> : "No"}
                </Field>
                <Field label="Conflict flag">
                  {entry.in_conflict ? <StatusPill tone="warn">Conflicting</StatusPill> : "No"}
                </Field>
                {entry.notes && (
                  <Field label="Notes" full>
                    <p className="text-sm text-foreground">{entry.notes}</p>
                  </Field>
                )}
              </section>

              {breakdown && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    Contribution to this facility × service ERI
                  </h3>
                  <div className="mt-2 flex items-center justify-between gap-4 rounded-md border border-border p-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Meter label="Directional support (S)" value={breakdown.S} tone="info" />
                      <Meter label="Sufficiency (Q)" value={breakdown.Q} tone="info" />
                      <Meter label="Consistency (C)" value={breakdown.C} tone="info" />
                    </div>
                    <EriBadge value={breakdown.eri} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {breakdown.reasons.join(" ")}
                  </p>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  Timeline for this facility × service
                </h3>
                <ol className="mt-2 space-y-2">
                  {related.map((r) => {
                    const conflictsWithCurrent =
                      r.id !== entry.id &&
                      !!r.in_conflict &&
                      !!entry.in_conflict &&
                      Math.abs(
                        new Date(r.observed_at).getTime() - new Date(entry.observed_at).getTime(),
                      ) <
                        90 * 60000 &&
                      observationTone(r.observation) !== observationTone(entry.observation);
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm",
                          r.id === entry.id
                            ? "border-primary/40 bg-primary/5"
                            : conflictsWithCurrent
                              ? "border-warn/40 bg-warn-soft"
                              : "border-border",
                        )}
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <span className="min-w-0 truncate font-medium">
                            {humanise(r.observation)}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {new Date(r.observed_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {humanise(r.source)}
                          {r.is_duplicate ? " · duplicate" : ""}
                        </p>
                        {conflictsWithCurrent && (
                          <p className="mt-1 text-xs font-medium text-[oklch(0.5_0.13_70)]">
                            Two credible reports disagree within the same window; consistency C is
                            reduced for this facility × service.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
