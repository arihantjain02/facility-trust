import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — RELI-REF" },
      { name: "description", content: "Administration in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Administration — RELI-REF" },
      { property: "og:description", content: "Administration in the RELI-REF referral reliability platform." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <AdminPage />
      </AppShell>
    </RequireAuth>
  ),
});

function AdminPage() {
  return <PageHeader title="Administration" />;
}
