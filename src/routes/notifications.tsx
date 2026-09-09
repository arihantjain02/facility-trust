import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — RELI-REF" },
      { name: "description", content: "Notifications in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Notifications — RELI-REF" },
      { property: "og:description", content: "Notifications in the RELI-REF referral reliability platform." },
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

function NotificationsPage() {
  return <PageHeader title="Notifications" />;
}
