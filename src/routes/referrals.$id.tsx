import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { ClipboardCopy, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  FlowChain,
  Meter,
  PageHeader,
  ReferralStatusPill,
  Section,
  SkeletonRows,
  StatusPill,
  humanise,
} from "@/components/ui-kit";
import { EriBadge } from "@/components/eri-badge";
import { getReferral, recordReferralOutcome, updateReferralStatus } from "@/lib/api/referrals.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals/$id")({
  head: () => ({
    meta: [
      { title: "Referral detail — RELI-REF" },
      { name: "description", content: "Track a referral's status, evidence snapshot and outcome." },
      { property: "og:title", content: "Referral detail — RELI-REF" },
      { property: "og:description", content: "Track a referral's status, evidence snapshot and outcome." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <ReferralDetailPage />
      </AppShell>
    </RequireAuth>
  ),
});

const TIMELINE = ["CREATED", "ACCEPTED", "ARRIVED", "COMPLETED"];
const OUTCOME_OPTIONS: { value: "SERVICE_PROVIDED" | "SERVICE_UNAVAILABLE"; label: string }[] = [
  { value: "SERVICE_PROVIDED", label: "Service provided" },
  { value: "SERVICE_UNAVAILABLE", label: "Service unavailable" },
];

function ReferralDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["referral", id], queryFn: () => getReferral({ data: { id } }) });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [outcomeChoice, setOutcomeChoice] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  const referral = query.data?.referral;

  useEffect(() => {
    if (referral?.token) {
      QRCode.toDataURL(referral.token, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => {});
    }
  }, [referral?.token]);

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Referral" subtitle="Loading referral details…" />
        <SkeletonRows rows={8} />
      </div>
    );
  }
  if (query.isError || !referral) {
    return (
      <div className="space-y-6">
        <PageHeader title="Referral" />
        <ErrorState
          message={(query.error as Error)?.message ?? "Referral not found"}
          retry={() => query.refetch()}
        />
      </div>
    );
  }

  const failed = referral.status === "SERVICE_UNAVAILABLE" || referral.status === "CANCELLED";
  const currentIndex = TIMELINE.indexOf(
    referral.status === "SERVICE_PROVIDED" ? "COMPLETED" : referral.status,
  );

  const advanceStatus = async (status: string) => {
    setUpdating(true);
    try {
      await updateReferralStatus({ data: { id, status: status as any, note: null } });
      toast.success(`Marked ${humanise(status)}`);
      qc.invalidateQueries({ queryKey: ["referral", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const confirmOutcome = async () => {
    if (!outcomeChoice) return;
    setUpdating(true);
    try {
      await recordReferralOutcome({
        data: { id, outcome: outcomeChoice as any, notes: null },
      });
      setRecorded(true);
      qc.invalidateQueries({ queryKey: ["referral", id] });
      toast.success("Outcome recorded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const snapshot = (referral.evidence_snapshot ?? {}) as any;
  const breakdown = snapshot.breakdown;

  return (
    <div className="space-y-6">
      <PageHeader
        title={referral.referral_code}
        subtitle={`${referral.services?.name ?? "Service"} referral`}
        meta={<ReferralStatusPill status={referral.status} />}
      />

      <Section title="Status timeline">
        <ol className="flex flex-wrap items-center gap-2">
          {TIMELINE.map((s, i) => {
            const done = !failed && i <= currentIndex;
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-sm border px-2.5 py-1 text-xs font-medium",
                    done ? "border-ok bg-ok-soft text-ok" : "border-border bg-surface-sunken text-muted-foreground",
                  )}
                >
                  {humanise(s)}
                </span>
                {i < TIMELINE.length - 1 && <span className="text-xs text-muted-foreground">→</span>}
              </li>
            );
          })}
          {failed && (
            <li className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">→</span>
              <StatusPill tone="danger">{humanise(referral.status)}</StatusPill>
            </li>
          )}
        </ol>
        {["CREATED", "ACCEPTED", "ARRIVED"].includes(referral.status) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {referral.status === "CREATED" && (
              <Button size="sm" disabled={updating} onClick={() => advanceStatus("ACCEPTED")}>
                Accept referral
              </Button>
            )}
            {referral.status === "ACCEPTED" && (
              <Button size="sm" disabled={updating} onClick={() => advanceStatus("ARRIVED")}>
                Mark arrived
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={updating} onClick={() => advanceStatus("CANCELLED")}>
              Cancel referral
            </Button>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Referral information">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Patient reference</dt><dd className="font-medium">{referral.patient_ref}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Urgency</dt><dd className="font-medium capitalize">{referral.urgency?.toLowerCase()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Created</dt><dd className="font-medium">{new Date(referral.created_at).toLocaleString()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Notes</dt><dd className="font-medium">{referral.notes ?? "—"}</dd></div>
          </dl>
        </Section>
        <Section title="Destination">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Facility</dt><dd className="font-medium">{referral.destination?.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Type</dt><dd className="font-medium">{referral.destination?.type}</dd></div>
            <div><dt className="text-xs text-muted-foreground">District</dt><dd className="font-medium">{referral.destination?.district}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Distance chosen</dt><dd className="font-medium">{referral.selected_distance_km} km</dd></div>
          </dl>
        </Section>
      </div>

      <Section title="Evidence used" description="Snapshot captured at referral time.">
        {breakdown ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <EriBadge value={referral.selected_eri ?? 0} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Meter label="Support (S)" value={breakdown.S} tone="info" />
              <Meter label="Sufficiency (Q)" value={breakdown.Q} tone="info" />
              <Meter label="Consistency (C)" value={breakdown.C} tone="info" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">Ranking explanation</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {(snapshot.why ?? []).map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No evidence snapshot recorded.</p>
        )}
      </Section>

      <Section title="Secure QR token" bodyClassName="p-4">
        <div className="mx-auto max-w-xs rounded-md border border-border bg-surface-sunken p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Secure referral</p>
          {qrDataUrl && <img src={qrDataUrl} alt="Referral QR token" className="mx-auto mt-3 size-40" />}
          <p className="mt-2 font-mono text-sm font-semibold">{referral.referral_code}</p>
          <p className="mt-1 text-xs text-muted-foreground">Scan at destination facility</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(referral.token);
                toast.success("Token copied");
              }}
            >
              <ClipboardCopy className="mr-1.5 size-4" /> Copy token
            </Button>
            {qrDataUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qrDataUrl;
                  a.download = `${referral.referral_code}-qr.png`;
                  a.click();
                }}
              >
                <Download className="mr-1.5 size-4" /> Download
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Status history">
        {(query.data?.history ?? []).length === 0 ? (
          <EmptyState title="No history yet" />
        ) : (
          <ol className="space-y-2 text-sm">
            {(query.data?.history ?? []).map((h: any) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0">
                <span className="font-medium">{humanise(h.to_status)}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
                {h.note && <span className="text-xs text-muted-foreground">— {h.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Outcome" description="What happened to this referral?">
        {query.data?.outcome ? (
          <div className="space-y-3">
            <StatusPill tone={query.data?.outcome.outcome === "SERVICE_PROVIDED" ? "ok" : "danger"}>
              {humanise(query.data?.outcome.outcome)}
            </StatusPill>
            <p className="text-sm text-muted-foreground">
              Outcome recorded. New evidence added to the ledger.
            </p>
            <FlowChain steps={["Referral", "Outcome", "Evidence", "ERI update", "Future ranking"]} />
          </div>
        ) : recorded ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-ok">Outcome recorded. New evidence added to the ledger.</p>
            <FlowChain steps={["Referral", "Outcome", "Evidence", "ERI update", "Future ranking"]} />
          </div>
        ) : ["ARRIVED", "ACCEPTED", "CREATED"].includes(referral.status) ? (
          <div className="flex flex-wrap items-center gap-2">
            {OUTCOME_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="outcome"
                  checked={outcomeChoice === o.value}
                  onChange={() => setOutcomeChoice(o.value)}
                />
                {o.label}
              </label>
            ))}
            <Button size="sm" disabled={!outcomeChoice || updating} onClick={confirmOutcome}>
              Confirm outcome
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No outcome recorded.</p>
        )}
      </Section>

      <p className="text-xs text-muted-foreground">
        <Link to="/referrals" className="underline">Back to referral register</Link>
      </p>
    </div>
  );
}
