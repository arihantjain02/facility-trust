import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  ScanLine,
  Settings2,
  ShieldCheck,
  Route as RouteIcon,
  WifiOff,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { listNotifications } from "@/lib/api/analytics.functions";
import { BrandLockup } from "@/components/brand";
import { DemoTag, SafetyNote } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
  exact?: boolean;
};

const OPERATIONS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/referrals", label: "Referrals", icon: RouteIcon, exact: true },
  {
    to: "/referrals/new",
    label: "Create referral",
    icon: PlusCircle,
    roles: ["REFERRAL_WORKER", "DISTRICT_SUPERVISOR", "ADMIN"],
  },
  {
    to: "/verify",
    label: "Verify referral",
    icon: ScanLine,
    roles: ["FACILITY_STAFF", "DISTRICT_SUPERVISOR", "ADMIN"],
  },
];

const EVIDENCE: NavItem[] = [
  { to: "/facilities", label: "Facilities", icon: Building2 },
  { to: "/evidence", label: "Evidence ledger", icon: Activity },
];

const INSIGHT: NavItem[] = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/validation", label: "Validation lab", icon: FlaskConical },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const ADMIN: NavItem[] = [
  { to: "/admin", label: "Administration", icon: ShieldCheck, roles: ["ADMIN"] },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "System administrator",
  DISTRICT_SUPERVISOR: "District supervisor",
  FACILITY_STAFF: "Facility staff",
  REFERRAL_WORKER: "Referral worker",
};

function allowed(item: NavItem, roles: string[]) {
  if (!item.roles) return true;
  return item.roles.some((r) => roles.includes(r));
}

function NavGroup({
  title,
  items,
  roles,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  roles: string[];
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {

  const visible = items.filter((i) => allowed(i, roles));
  if (visible.length === 0) return null;
  return (
    <div className="px-2">
      {!collapsed && (
        <p className="px-2 pb-1 pt-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
          {title}
        </p>
      )}
      <ul className="space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                activeOptions={{ exact: item.exact ?? false }}
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center",
                )}
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                }}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SidebarBody({
  roles,
  collapsed,
  onNavigate,
}: {
  roles: string[];
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto pb-4">

      <NavGroup title="Operations" items={OPERATIONS} roles={roles} collapsed={collapsed} onNavigate={onNavigate} />
      <NavGroup title="Evidence" items={EVIDENCE} roles={roles} collapsed={collapsed} onNavigate={onNavigate} />
      <NavGroup title="Insight" items={INSIGHT} roles={roles} collapsed={collapsed} onNavigate={onNavigate} />
      <NavGroup title="Governance" items={ADMIN} roles={roles} collapsed={collapsed} onNavigate={onNavigate} />
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { online, pending, lastSync } = useSyncStatus();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60000,
  });
  const unread = (notifications.data ?? []).filter((n: any) => !n.is_read).length;

  const primaryRole = roles[0];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link to="/dashboard" className="min-w-0">
            <BrandLockup compact={collapsed} />
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse navigation"
              className="rounded-sm p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand navigation"
            className="mx-auto mt-2 rounded-sm p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Menu className="size-4" />
          </button>
        )}

        <SidebarBody roles={roles} collapsed={collapsed} />

        <div className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {user?.email ?? "Signed out"}
                </p>
                <p className="truncate text-[0.68rem] text-sidebar-foreground/55">
                  {primaryRole ? ROLE_LABEL[primaryRole] ?? primaryRole : "No role assigned"}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Link
                  to="/admin"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-sidebar-border px-2 py-1.5 text-[0.7rem] text-sidebar-foreground/80 hover:bg-sidebar-accent"
                >
                  <Settings2 className="size-3.5" /> Settings
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    router.navigate({ to: "/auth" });
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-sidebar-border px-2 py-1.5 text-[0.7rem] text-sidebar-foreground/80 hover:bg-sidebar-accent"
                >
                  <LogOut className="size-3.5" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                await signOut();
                router.navigate({ to: "/auth" });
              }}
              aria-label="Sign out"
              className="mx-auto flex rounded-sm p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
              <BrandLockup />
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close navigation"
                className="rounded-sm p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarBody roles={roles} collapsed={false} onNavigate={() => setDrawer(false)} />
            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/auth" });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-sidebar-border px-2 py-2 text-xs text-sidebar-foreground/80"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawer(true)}
                aria-label="Open navigation"
                className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted md:hidden"
              >
                <Menu className="size-5" />
              </button>
              <span className="hidden text-xs text-muted-foreground lg:inline">
                {now
                  ? now.toLocaleString(undefined, {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
            </div>

            <div className="min-w-0 justify-self-center">
              <DemoTag />
            </div>

            <div className="flex items-center gap-2 justify-self-end">
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.68rem] font-medium sm:inline-flex",
                  online
                    ? pending > 0
                      ? "border-info/30 bg-info-soft text-info"
                      : "border-ok/25 bg-ok-soft text-ok"
                    : "border-warn/35 bg-warn-soft text-[oklch(0.48_0.12_70)]",
                )}
                title={lastSync ? `Last synchronised ${lastSync.toLocaleTimeString()}` : undefined}
              >
                {online ? (
                  <span className={cn("size-1.5 rounded-full", pending > 0 ? "bg-info" : "bg-ok")} />
                ) : (
                  <WifiOff className="size-3.5" />
                )}
                {online
                  ? pending > 0
                    ? `${pending} pending sync`
                    : "Synchronised"
                  : "Offline mode"}
              </span>

              <Link
                to="/notifications"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                className="relative rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell className="size-4.5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.6rem] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <div className="hidden min-w-0 border-l border-border pl-3 text-right sm:block">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                <p className="truncate text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {primaryRole ? ROLE_LABEL[primaryRole] ?? primaryRole : "No role"}
                </p>
              </div>
            </div>
          </div>

          {!online && (
            <div className="bg-warn-soft px-4 py-1.5 text-center text-xs text-[oklch(0.45_0.12_70)]">
              Offline mode — reports are stored on this device and will sync automatically.
              {lastSync && ` Last synchronised ${lastSync.toLocaleTimeString()}.`}
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-[92rem] flex-1 space-y-6 px-3 py-6 sm:px-5">
          {children}
        </main>

        <footer className="border-t border-border bg-card px-4 py-5">
          <div className="mx-auto max-w-[92rem] space-y-2">
            <SafetyNote />
            <p className="text-[0.68rem] text-muted-foreground/70">
              RELI-REF · Evidence-driven referral reliability · SIH 2026 • Tech Alchemists · All data
              shown is fictional demonstration data.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
