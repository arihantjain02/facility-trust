import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { getBaselines, runValidation } from "@/lib/api/validation.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/validation")({
  head: () => ({
    meta: [
      { title: "Validation lab — RELI-REF" },
      { name: "description", content: "Seeded simulations comparing the candidate evidence model against simple baselines." },
      { property: "og:title", content: "Validation lab — RELI-REF" },
      { property: "og:description", content: "Seeded simulations comparing the candidate evidence model against simple baselines." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell>
        <ValidationLab />
      </AppShell>
    </RequireAuth>
  ),
});

function ValidationLab() {
  const meta = useQuery({ queryKey: ["baselines"], queryFn: () => getBaselines() });
  const [scenario, setScenario] = useState("normal");
  const [seedCount, setSeedCount] = useState(30);
  const run = useMutation({
    mutationFn: () => runValidation({ data: { scenario, seedCount, startSeed: 1, runsPerSeed: 3, methods: [] } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Validation lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulated worlds only. These results are not clinical evidence and do not describe real
          service performance.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <select className="rounded border border-input bg-background px-3 py-2 text-sm" value={scenario} onChange={(e) => setScenario(e.target.value)}>
          {(meta.data?.scenarios ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <input
          className="w-28 rounded border border-input bg-background px-3 py-2 text-sm"
          type="number"
          min={1}
          max={100}
          value={seedCount}
          onChange={(e) => setSeedCount(Number(e.target.value))}
        />
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Running…" : "Run simulation"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {(meta.data?.scenarios ?? []).find((s) => s.id === scenario)?.description}
        </p>
      </div>

      {run.data && (
        <section className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Service found</th>
                <th className="px-3 py-2">Wasted trips</th>
                <th className="px-3 py-2">Avg travel (km)</th>
                <th className="px-3 py-2">Runs</th>
              </tr>
            </thead>
            <tbody>
              {run.data.results.map((r: any) => (
                <tr key={r.method} className="border-t border-border">
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2">{Math.round(r.successRate * 100)}%</td>
                  <td className="px-3 py-2">{r.wastedTrips}</td>
                  <td className="px-3 py-2">{r.averageDistanceKm.toFixed(1)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{run.data!.totalRuns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
