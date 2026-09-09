import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/facilities")({
  head: () => ({
    meta: [
      { title: "Facilities — RELI-REF" },
      { name: "description", content: "Facilities in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Facilities — RELI-REF" },
      { property: "og:description", content: "Facilities in the RELI-REF referral reliability platform." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <FacilitiesPage />
      </AppShell>
    </RequireAuth>
  ),
});

function FacilitiesPage() {
  return <PageHeader title="Facilities" />;
}
