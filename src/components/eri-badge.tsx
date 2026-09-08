export function EriBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 60 ? "bg-signal-strong" : pct >= 30 ? "bg-signal-medium" : "bg-signal-weak";
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      Evidence {pct}%
    </span>
  );
}

export function FreshnessTag({ band }: { band: string }) {
  const label = band.replace("_", " ").toLowerCase();
  return (
    <span className="rounded border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">
      {label === "none" ? "no reports" : label}
    </span>
  );
}
