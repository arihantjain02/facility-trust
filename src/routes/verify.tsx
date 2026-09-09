import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify referral — RELI-REF" },
      { name: "description", content: "Verify referral in the RELI-REF referral reliability platform." },
      { property: "og:title", content: "Verify referral — RELI-REF" },
      { property: "og:description", content: "Verify referral in the RELI-REF referral reliability platform." },
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
  return <PageHeader title="Verify referral" />;
}
