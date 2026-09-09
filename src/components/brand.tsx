/**
 * RELI-REF brand mark.
 * A shield-like referral pathway: two facility nodes linked by a verified path,
 * with a health cross at the destination. Minimal, institutional, monochrome-safe.
 */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="RELI-REF"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2.5 27.5 6.4v9.3c0 6.9-4.6 12.2-11.5 14.3C9.1 27.9 4.5 22.6 4.5 15.7V6.4L16 2.5Z"
        className="fill-current opacity-90"
      />
      <path
        d="M10.5 19.5c0-4 2.6-6 5.5-6s5.5 2 5.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="text-background opacity-0"
      />
      <circle cx="10.6" cy="19.4" r="2.1" className="fill-background" />
      <path
        d="M10.6 19.4c0-4.7 2.4-7.2 5.4-7.2s5.4 2.5 5.4 7.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2.6 2.2"
        className="text-background"
      />
      <path
        d="M20.2 8.2h2.6v2.6h2.6v2.6h-2.6v2.6h-2.6v-2.6h-2.6v-2.6h2.6V8.2Z"
        className="fill-background"
      />
    </svg>
  );
}

export function BrandLockup({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark
        className={`size-8 shrink-0 ${tone === "dark" ? "text-primary" : "text-sidebar-primary"}`}
      />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div
            className={`truncate text-[0.95rem] font-semibold tracking-tight ${
              tone === "dark" ? "text-foreground" : "text-sidebar-foreground"
            }`}
          >
            RELI-REF
          </div>
          <div
            className={`truncate text-[0.66rem] uppercase tracking-[0.11em] ${
              tone === "dark" ? "text-muted-foreground" : "text-sidebar-foreground/60"
            }`}
          >
            Referral reliability
          </div>
        </div>
      )}
    </div>
  );
}
