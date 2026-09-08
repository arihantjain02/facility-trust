import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { provisionDemoUsers, DEMO_USERS } from "@/lib/api/demo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

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
    try {
      await provisionDemoUsers();
    } catch {
      /* demo accounts may already exist */
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to RELI-REF</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Referral evidence for facility, service and time. Demo accounts are fictional.
        </p>
        <form className="mt-6 space-y-4" onSubmit={signIn}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo roles</p>
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => {
                setEmail(u.email);
                setPassword(u.password);
              }}
            >
              <span>{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.role.replace("_", " ").toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
