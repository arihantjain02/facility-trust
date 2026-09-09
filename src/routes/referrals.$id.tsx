import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/referrals/$id")({
  head: () => ({
    meta: [
      { title: "Referral detail — RELI-REF" },
      { name: "description", content: "Referral detail in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Referral detail — RELI-REF" },
      { property: "og:description", content: "Referral detail in the RELI-REF referral reliability platform." },
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

function ReferralDetailPage() {
  return <PageHeader title="Referral detail" />;
}
