import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, ShieldAlert, SearchCheck, GitBranchPlus, ListOrdered, RefreshCcw } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { FlowChain, SafetyNote, Section } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RELI-REF — evidence-driven referral reliability" },
      {
        name: "description",
        content:
          "RELI-REF tracks facility, service and time evidence so referral staff can choose destinations that are actually working right now.",
      },
      { property: "og:title", content: "RELI-REF — evidence-driven referral reliability" },
      {
        property: "og:description",
        content:
          "Record, check, summarise, decide, rank and learn: referral support built on freshness-weighted service evidence.",
      },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { title: "Record", body: "Front-line staff report whether a service is working right now.", icon: ClipboardCheck },
  { title: "Check", body: "Duplicate, stale and conflicting reports are flagged automatically.", icon: SearchCheck },
  { title: "Summarise", body: "Each facility-service pair gets a time-aware reliability score.", icon: GitBranchPlus },
  { title: "Decide", body: "Ineligible, blocked or unsupported options are removed.", icon: ShieldAlert },
  { title: "Rank", body: "Remaining options are ordered by evidence, then by distance.", icon: ListOrdered },
  { title: "Learn", body: "Recorded referral outcomes feed straight back into the ledger.", icon: RefreshCcw },
];

const ERI_COMPONENTS = [
  {
    letter: "S",
    name: "Directional Support",
    body: "Does the latest evidence say the service is currently available at this facility?",
  },
  {
    letter: "Q",
    name: "Evidence Sufficiency",
    body: "How much recent, non-duplicate reporting exists to support that judgement?",
  },
  {
    letter: "C",
    name: "Evidence Consistency",
    body: "Do independent reports agree, or is the picture conflicting and unresolved?",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface-deep">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <BrandLockup tone="dark" />
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="border-b border-border bg-surface-sunken">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Facility × Service × Time
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Being registered for a service is not proof it is working today.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Patients are referred, they travel, and the service turns out to be unavailable.
            RELI-REF keeps a freshness-weighted evidence ledger of what staff actually observe, so
            the next referral is directed somewhere the evidence currently supports.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">Evidence-driven referral reliability</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <Section title="The referral evidence pipeline" description="How a single report becomes a ranked, safe recommendation.">
          <div className="hidden lg:block">
            <FlowChain steps={PIPELINE.map((p) => p.title)} className="mb-6 justify-center" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((p, i) => (
              <div key={p.title} className="rounded-md border border-border bg-surface-sunken p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary text-[0.68rem] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p.icon className="size-4 text-muted-foreground" aria-hidden />
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <Section title="How the Evidence Reliability Index (ERI) works" description="ERI = S × Q × C, computed per facility, per service, at a point in time.">
          <div className="grid gap-4 sm:grid-cols-3">
            {ERI_COMPONENTS.map((c) => (
              <div key={c.letter} className="rounded-md border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent">
                    {c.letter}
                  </span>
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Section title="What RELI-REF does not do" className="border-warn/30 bg-warn-soft/40">
          <SafetyNote />
        </Section>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">
            RELI-REF · Evidence-driven referral reliability. All demonstration data is fictional.
          </p>
          <p className="text-[0.7rem] text-muted-foreground/60">
            SIH 2026 • Tech Alchemists · Problem Statement 26133
          </p>
        </div>
      </footer>
    </div>
  );
}
