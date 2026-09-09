/** Unobtrusive reminder that figures shown come from fictional demonstration data. */
export function DemoNote({ className }: { className?: string }) {
  return (
    <p className={"text-[0.7rem] leading-relaxed text-muted-foreground/80 " + (className ?? "")}>
      Figures shown are computed from fictional demonstration data seeded in this environment.
    </p>
  );
}
