import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RELI-REF — evidence-ranked health referrals" },
      {
        name: "description",
        content:
          "RELI-REF tracks facility, service and time evidence so referral staff can choose destinations that are actually working right now.",
      },
      { property: "og:title", content: "RELI-REF — evidence-ranked health referrals" },
      {
        property: "og:description",
        content:
          "Record, check, summarise, decide, rank and learn: referral support built on freshness-weighted service evidence.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  ["Record", "Staff report whether a service is working right now."],
  ["Check", "Duplicate, stale and conflicting reports are flagged."],
  ["Summarise", "Each facility-service gets a reliability score."],
  ["Decide", "Ineligible and blocked options are removed."],
  ["Rank", "Remaining options are ordered by evidence, then travel."],
  ["Learn", "Referral outcomes feed straight back into the ledger."],
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">RELI-REF</span>
        <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Facility × Service × Time
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Being registered is not proof the service is working today.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
          Patients are referred, they travel, and the service turns out to be unavailable. RELI-REF
          keeps a freshness-weighted ledger of what staff actually report, so the next referral goes
          somewhere the evidence supports.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Open the demo
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, body]) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        RELI-REF does not diagnose, recommend treatment, make clinical decisions or guarantee that a
        service will be available on arrival. The human referral protocol remains the final
        safeguard. All demonstration data is fictional.
      </footer>
    </div>
  );
}
