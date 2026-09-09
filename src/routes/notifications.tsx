import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Check, CheckCheck, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { listNotifications, markNotificationRead } from "@/lib/api/analytics.functions";
import { Button } from "@/components/ui/button";
import { DemoNote } from "@/components/insight/demo-note";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  SkeletonRows,
  StatusPill,
  humanise,
  type Tone,
} from "@/components/ui-kit";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — RELI-REF" },
      { name: "description", content: "Notification centre for referral, evidence and conflict alerts across RELI-REF." },
      { property: "og:title", content: "Notifications — RELI-REF" },
      { property: "og:description", content: "Notification centre for referral, evidence and conflict alerts across RELI-REF." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <NotificationsPage />
      </AppShell>
    </RequireAuth>
  ),
});

function iconFor(type: string) {
  const t = type.toUpperCase();
  if (t.includes("CONFLICT")) return ShieldAlert;
  if (t.includes("FAIL") || t.includes("UNAVAILABLE") || t.includes("ALERT")) return AlertTriangle;
  if (t.includes("INFO")) return Info;
  return Bell;
}

function toneFor(type: string): Tone {
  const t = type.toUpperCase();
  if (t.includes("CONFLICT") || t.includes("FAIL") || t.includes("UNAVAILABLE")) return "danger";
  if (t.includes("WARN") || t.includes("STALE")) return "warn";
  if (t.includes("SUCCESS") || t.includes("PROVIDED")) return "ok";
  return "info";
}

function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });
  const [filterType, setFilterType] = useState<string>("ALL");

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const unread = (data ?? []).filter((n: any) => !n.is_read);
      for (const n of unread) {
        await markNotificationRead({ data: { id: n.id } });
      }
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const types = useMemo(
    () => Array.from(new Set((data ?? []).map((n: any) => n.kind as string))).sort(),
    [data],
  );

  const filtered = useMemo(
    () => (data ?? []).filter((n: any) => filterType === "ALL" || n.kind === filterType),
    [data, filterType],
  );

  const unread = filtered.filter((n: any) => !n.is_read);
  const read = filtered.filter((n: any) => n.is_read);
  const unreadTotal = (data ?? []).filter((n: any) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alerts about referrals, evidence and conflicts relevant to your role."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={unreadTotal === 0 || markAll.isPending}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        }
      />

      {isError && <ErrorState message="Could not load notifications." retry={() => void refetch()} />}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilterType("ALL")}
          className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
            filterType === "ALL"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-surface-sunken"
          }`}
        >
          All
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
              filterType === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-surface-sunken"
            }`}
          >
            {humanise(t)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No notifications" body="You're all caught up — nothing needs your attention right now." icon={<Bell className="size-6" />} />
      ) : (
        <div className="space-y-6">
          <Section title="Unread" description={`${unread.length} notification(s)`}>
            {unread.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unread notifications.</p>
            ) : (
              <ul className="space-y-2">
                {unread.map((n: any) => {
                  const Icon = iconFor(n.kind);
                  return (
                    <li
                      key={n.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-sm border border-border bg-surface-sunken px-3 py-2.5"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{n.title}</p>
                          <StatusPill tone={toneFor(n.kind)}>{humanise(n.kind)}</StatusPill>
                        </div>
                        {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => markRead.mutate(n.id)}
                        disabled={markRead.isPending}
                      >
                        <Check className="size-4" /> Mark as read
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Read" description={`${read.length} notification(s)`}>
            {read.length === 0 ? (
              <p className="text-sm text-muted-foreground">No read notifications yet.</p>
            ) : (
              <ul className="space-y-2">
                {read.map((n: any) => {
                  const Icon = iconFor(n.kind);
                  return (
                    <li
                      key={n.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-sm border border-border px-3 py-2.5 opacity-70"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{n.title}</p>
                          <StatusPill tone="neutral">{humanise(n.kind)}</StatusPill>
                        </div>
                        {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      )}
      <DemoNote />
    </div>
  );
}
