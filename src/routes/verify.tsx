import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  ReferralStatusPill,
  Section,
  SkeletonRows,
  Td,
  Tr,
  humanise,
} from "@/components/ui-kit";
import { getMe } from "@/lib/api/core.functions";
import {
  listIncomingReferrals,
  recordReferralOutcome,
  updateReferralStatus,
  verifyReferralToken,
} from "@/lib/api/referrals.functions";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify referral — RELI-REF" },
      { name: "description", content: "Fast counter-side verification and status updates for incoming referrals." },
      { property: "og:title", content: "Verify referral — RELI-REF" },
      { property: "og:description", content: "Fast counter-side verification and status updates for incoming referrals." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <VerifyPage />
      </AppShell>
    </RequireAuth>
  ),
});

function VerifyPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const facilityId = me.data?.facility?.id;
  const incoming = useQuery({
    queryKey: ["incoming-referrals", facilityId],
    queryFn: () => listIncomingReferrals({ data: facilityId ? { facility_id: facilityId } : {} }),
  });

  const verify = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setChecked(false);
    try {
      const res = await verifyReferralToken({ data: { token: token.trim() } });
      setResult(res.valid ? res.referral : null);
      setChecked(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runStatus = async (status: string) => {
    if (!result) return;
    setBusy(true);
    try {
      await updateReferralStatus({ data: { id: result.id, status: status as any, note: null } });
      toast.success(`Marked ${humanise(status)}`);
      setResult({ ...result, status });
      qc.invalidateQueries({ queryKey: ["incoming-referrals"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runOutcome = async (outcome: "SERVICE_PROVIDED" | "SERVICE_UNAVAILABLE") => {
    if (!result) return;
    setBusy(true);
    try {
      await recordReferralOutcome({ data: { id: result.id, outcome, notes: null } });
      toast.success("Outcome recorded. New evidence added to the ledger.");
      setResult({ ...result, status: outcome });
      qc.invalidateQueries({ queryKey: ["incoming-referrals"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify referral"
        subtitle="Fast counter-side verification for arriving patients."
      />

      <Section bodyClassName="p-5">
        <label htmlFor="token-input" className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          Referral token
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id="token-input"
            ref={inputRef}
            autoFocus
            placeholder="Scan or type token…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            className="h-14 text-lg tracking-wide"
          />
          <Button size="lg" className="h-14 shrink-0 px-8 text-base" disabled={busy || !token.trim()} onClick={verify}>
            <Search className="mr-2 size-5" /> Verify
          </Button>
        </div>

        {checked && !result && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <XCircle className="size-4" /> No referral matches that token. Check the code and try again.
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4 rounded-md border border-ok/30 bg-ok-soft p-4">
            <div className="flex flex-wrap items-center gap-2 text-ok">
              <CheckCircle2 className="size-5" />
              <span className="text-lg font-semibold">{result.referral_code}</span>
              <ReferralStatusPill status={result.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Service</dt><dd className="font-medium">{result.services?.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Referring facility</dt><dd className="font-medium">{result.origin?.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Destination</dt><dd className="font-medium">{result.destination?.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Created</dt><dd className="font-medium">{new Date(result.created_at).toLocaleString()}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button size="lg" disabled={busy || result.status !== "CREATED"} onClick={() => runStatus("ACCEPTED")}>
                Accept referral
              </Button>
              <Button size="lg" variant="outline" disabled={busy || result.status !== "ACCEPTED"} onClick={() => runStatus("ARRIVED")}>
                Patient arrived
              </Button>
              <Button size="lg" variant="outline" disabled={busy || !["ARRIVED", "ACCEPTED", "CREATED"].includes(result.status)} onClick={() => runOutcome("SERVICE_PROVIDED")}>
                Service provided
              </Button>
              <Button size="lg" variant="outline" disabled={busy || !["ARRIVED", "ACCEPTED", "CREATED"].includes(result.status)} onClick={() => runOutcome("SERVICE_UNAVAILABLE")}>
                Service unavailable
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Incoming referrals" description="Referrals awaiting action at your facility.">
        {incoming.isLoading ? (
          <SkeletonRows rows={4} />
        ) : incoming.isError ? (
          <ErrorState message={(incoming.error as Error).message} retry={() => incoming.refetch()} />
        ) : (incoming.data ?? []).length === 0 ? (
          <EmptyState title="No incoming referrals" body="Nothing is currently awaiting verification." />
        ) : (
          <DataTable head={["Code", "From", "Service", "Status", "Created"]}>
            {(incoming.data ?? []).map((r: any) => (
              <Tr key={r.id}>
                <Td className="font-mono text-xs font-medium">{r.referral_code}</Td>
                <Td className="max-w-[10rem] truncate">{r.origin?.name}</Td>
                <Td className="max-w-[8rem] truncate">{r.services?.name}</Td>
                <Td><ReferralStatusPill status={r.status} /></Td>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </Section>
    </div>
  );
}
