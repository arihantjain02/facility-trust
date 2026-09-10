import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USERS } from "@/lib/demo-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { BrandLockup } from "@/components/brand";
import { FlowChain, SafetyNote } from "@/components/ui-kit";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RELI-REF referral evidence platform" },
      { name: "description", content: "Sign in to record service evidence and manage referrals in RELI-REF." },
      { property: "og:title", content: "Sign in — RELI-REF" },
      { property: "og:description", content: "Sign in to record service evidence and manage referrals in RELI-REF." },
    ],
  }),
  component: AuthPage,
});

const ROLE_DESCRIPTION: Record<string, string> = {
  REFERRAL_WORKER: "Creates referrals and picks a ranked, evidence-supported destination.",
  FACILITY_STAFF: "Records service availability and verifies arriving referrals.",
  DISTRICT_SUPERVISOR: "Monitors district-wide reliability, conflicts and analytics.",
  ADMIN: "Manages users, thresholds and system configuration.",
};

function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("worker@reliref.demo");
  const [password, setPassword] = useState("RelirefDemo#2026");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.navigate({ to: "/dashboard" });
  }, [user, router]);

  const signIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setMessage(null);
    let signedIn = false;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) signedIn = true;
    } catch (err) {
      setMessage(
        err instanceof Error && err.message
          ? err.message
          : "Sign-in is temporarily unavailable. Please try again shortly.",
      );
    } finally {
      setBusy(false);
    }
    if (signedIn) {
      try {
        await router.navigate({ to: "/dashboard" });
      } catch {
        window.location.href = "/dashboard";
      }
    }
  };


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-surface-deep px-10 py-10 text-foreground lg:flex">
        <Link to="/">
          <BrandLockup tone="dark" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Facility × Service × Time
          </p>
          <h1 className="mt-3 max-w-md text-2xl font-semibold tracking-tight">
            Evidence-driven referral reliability for public health referrals.
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Every referral decision is backed by a freshness-weighted ledger of what staff report,
            not just a static facility registry.
          </p>
          <FlowChain
            steps={["Record", "Check", "Summarise", "Decide", "Rank", "Learn"]}
            className="mt-6"
          />
        </div>
        <SafetyNote className="max-w-md" />
      </div>

      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-md border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 lg:hidden">
            <Link to="/">
              <BrandLockup />
            </Link>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to RELI-REF</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Referral evidence for facility, service and time. Demo accounts are fictional.
          </p>
          <form className="mt-6 space-y-4" onSubmit={signIn} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {message && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{message}</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Demo roles — select to autofill credentials
            </p>
            <div className="space-y-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    setMessage(null);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {ROLE_DESCRIPTION[u.role] ?? ""}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[0.68rem] text-muted-foreground/80">
                      {u.email}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-sm bg-muted px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {u.role.replace("_", " ").toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
