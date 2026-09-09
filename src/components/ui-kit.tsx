/**
 * RELI-REF shared presentation primitives.
 * Institutional, data-dense, status-driven. Used across every operational screen.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- page ---- */

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border pb-5 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {(title || actions) && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------- status ---- */

export type Tone = "ok" | "warn" | "danger" | "info" | "stale" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-[oklch(0.5_0.13_70)] border-warn/35",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  stale: "bg-stale-soft text-stale border-stale/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

const DOT_CLASS: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  stale: "bg-stale",
  neutral: "bg-muted-foreground",
};

export function StatusPill({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} />}
      {children}
    </span>
  );
}

/** Maps a raw observation / availability string to a tone + label. */
export function observationTone(observation: string): Tone {
  switch (observation) {
    case "AVAILABLE":
    case "SERVICE_PROVIDED":
    case "LIKELY_AVAILABLE":
      return "ok";
    case "UNAVAILABLE":
    case "SERVICE_UNAVAILABLE":
    case "LIKELY_UNAVAILABLE":
      return "danger";
    case "TEMPORARILY_BLOCKED":
    case "PARTIAL":
    case "CONFLICTING":
      return "warn";
    default:
      return "neutral";
  }
}

export function freshnessTone(band: string): Tone {
  switch (band) {
    case "VERY_FRESH":
    case "FRESH":
      return "ok";
    case "AGING":
      return "warn";
    case "STALE":
      return "stale";
    default:
      return "neutral";
  }
}

export function humanise(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function ReferralStatusPill({ status }: { status: string }) {
  const tone: Tone =
    status === "SERVICE_PROVIDED"
      ? "ok"
      : status === "SERVICE_UNAVAILABLE"
        ? "danger"
        : status === "CANCELLED"
          ? "neutral"
          : status === "ARRIVED"
            ? "warn"
            : "info";
  return <StatusPill tone={tone}>{humanise(status)}</StatusPill>;
}

/* ----------------------------------------------------------------- kpi ---- */

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: Tone;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {delta && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              deltaTone === "ok" && "text-ok",
              deltaTone === "danger" && "text-danger",
              deltaTone === "warn" && "text-[oklch(0.5_0.13_70)]",
              deltaTone === "neutral" && "text-muted-foreground",
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-sunken px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-danger/85">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-2 rounded-sm border border-danger/30 px-2.5 py-1 text-xs font-medium hover:bg-danger/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-sm bg-muted" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-md border border-border bg-muted/60" />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- table --- */

export function DataTable({
  head,
  children,
  className,
}: {
  head: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-sunken text-left">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-2.5 align-middle", className)}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-surface-sunken focus:bg-surface-sunken focus:outline-none",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* ---------------------------------------------------------------- misc ---- */

export function DemoTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-warn/40 bg-warn-soft px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.09em] text-[oklch(0.48_0.12_70)]">
      Demo environment
    </span>
  );
}

export function SafetyNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      RELI-REF supports operational referral choices using reported evidence. It does not diagnose,
      recommend treatment, make clinical decisions, or guarantee that a service will be available on
      arrival. The human referral protocol remains the final safeguard.
    </p>
  );
}

/** Miniature meter used for S / Q / C components of the ERI. */
export function Meter({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: number;
  tone?: Tone;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", DOT_CLASS[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Record → Check → Summarise → Decide → Rank → Learn / feedback loop chain. */
export function FlowChain({
  steps,
  className,
}: {
  steps: string[];
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="rounded-sm border border-border bg-surface-sunken px-2 py-1 text-[0.7rem] font-medium">
            {s}
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="text-xs text-muted-foreground">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
