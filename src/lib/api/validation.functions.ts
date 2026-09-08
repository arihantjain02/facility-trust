import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "./helpers";
import { METHODS, SCENARIOS, runSimulation, type MethodId, type ScenarioId } from "@/lib/validation/simulator";

export const getBaselines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ methods: METHODS, scenarios: SCENARIOS }));

export const runValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        scenario: z.string(),
        seedCount: z.number().min(1).max(200).default(30),
        startSeed: z.number().min(1).max(100000).default(1),
        runsPerSeed: z.number().min(1).max(20).default(3),
        methods: z.array(z.string()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const seeds = Array.from({ length: data.seedCount }, (_, i) => data.startSeed + i);
    const output = runSimulation({
      scenario: data.scenario as ScenarioId,
      seeds,
      runsPerSeed: data.runsPerSeed,
      methods: data.methods as MethodId[],
    });
    await writeAudit(context.supabase, {
      user_id: context.userId,
      actor_email: (context.claims as any)?.email ?? null,
      action: "VALIDATION_RUN",
      resource: "validation",
      metadata: { scenario: data.scenario, seeds: seeds.length, runs: output.totalRuns },
    });
    return output;
  });
