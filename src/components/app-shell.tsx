import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/evidence", label: "Evidence ledger" },
  { to: "/referrals", label: "Referrals" },
  { to: "/analytics", label: "Analytics" },
  { to: "/validation", label: "Validation lab" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
            RELI-REF
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "rounded px-3 py-1.5 bg-secondary text-foreground font-medium" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user?.email} · {roles.join(", ") || "no role"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                router.navigate({ to: "/auth" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        RELI-REF supports operational referral choices using reported evidence. It does not
        diagnose, recommend treatment, make clinical decisions, or guarantee that a service will be
        available on arrival. All data shown here is fictional demonstration data.
      </footer>
    </div>
  );
}
