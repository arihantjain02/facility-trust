import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/referrals/new")({
  head: () => ({
    meta: [
      { title: "Create referral — RELI-REF" },
      { name: "description", content: "Create referral in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Create referral — RELI-REF" },
      { property: "og:description", content: "Create referral in the RELI-REF referral reliability platform." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <NewReferralPage />
      </AppShell>
    </RequireAuth>
  ),
});

function NewReferralPage() {
  return <PageHeader title="Create referral" />;
}
