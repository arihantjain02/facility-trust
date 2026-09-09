import { StatusPill, freshnessTone, humanise, type Tone } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export function eriTone(value: number): Tone {
  const pct = value * 100;
  return pct >= 60 ? "ok" : pct >= 30 ? "warn" : "danger";
}

export function eriLabel(value: number) {
  const pct = value * 100;
  return pct >= 60 ? "High" : pct >= 30 ? "Moderate" : "Low";
}

export function EriBadge({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const tone = eriTone(value);
  return (
    <StatusPill tone={tone}>
      ERI {value.toFixed(2)}
      {showLabel && <span className="opacity-70">· {eriLabel(value)}</span>}
    </StatusPill>
  );
}

/** Large ERI read-out for evidence check / ranking screens. */
export function EriDial({ value, className }: { value: number; className?: string }) {
  const tone = eriTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="grid size-16 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--${tone === "ok" ? "ok" : tone === "warn" ? "warn" : "danger"}) ${pct}%, var(--muted) 0)`,
        }}
      >
        <div className="grid size-12 place-items-center rounded-full bg-card">
          <span className="text-sm font-semibold tabular-nums">{value.toFixed(2)}</span>
        </div>
      </div>
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Evidence reliability
        </p>
        <p className="text-sm font-semibold">{eriLabel(value)}</p>
      </div>
    </div>
  );
}

export function FreshnessTag({ band }: { band: string }) {
  if (band === "duplicate") return <StatusPill tone="neutral">Duplicate</StatusPill>;
  if (band === "conflict") return <StatusPill tone="warn">Conflict</StatusPill>;
  if (!band || band === "NONE" || band === "none")
    return <StatusPill tone="neutral">No reports</StatusPill>;
  return <StatusPill tone={freshnessTone(band)}>{humanise(band)}</StatusPill>;
}
