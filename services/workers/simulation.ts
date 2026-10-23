import {
  assertEngineVersion,
  EngineVersionError,
} from "../../packages/simulation-core/version";
import { get, put } from "../../apps/web/lib/db";
import { decide, eventsFor } from "../../packages/simulation-core";
import type {
  Simulation,
  Dataset,
  CustomerDecision,
  SimulationEvent,
} from "../../packages/contracts";
const g = globalThis as unknown as { simulaJobs?: Set<string> };
const jobs = (g.simulaJobs ??= new Set());
export function workspaceBusy(workspace: string) {
  return [...jobs].some((key) => key.startsWith(workspace));
}
export async function runSimulation(
  workspace: string,
  id: string,
  storage = { get, put },
) {
  const { get, put } = storage;
  const lock = workspace + id;
  if (jobs.has(lock)) return;
  jobs.add(lock);
  try {
    const sim = await get<Simulation>(workspace, "simulation", id);
    if (!sim || sim.status === "completed") return;
    assertEngineVersion(sim.engineVersion);
    const dataset = await get<Dataset>(workspace, "dataset", sim.datasetId);
    if (!dataset) throw Error("Base da simulação indisponível.");
    const profiles = dataset.profiles.filter(
      (p) => !sim.segments.length || sim.segments.includes(p.segmentId ?? ""),
    );
    sim.status = "executing";
    sim.error = undefined;
    await put(workspace, "simulation", id, sim);
    for (let start = sim.processed; start < profiles.length; start += 250) {
      const batch = profiles.slice(start, start + 250);
      for (const scenario of sim.scenarios) {
        const decisions = batch.map((p) => decide(p, sim, scenario));
        const key = `${id}:${scenario.id}:${start}`;
        await put(workspace, "decisions", key, decisions); // Persist source of truth before creating replay events.
        const persisted = await get<CustomerDecision[]>(
          workspace,
          "decisions",
          key,
        );
        if (!persisted) throw Error("Falha ao confirmar persistência.");
        await put(
          workspace,
          "events",
          key,
          persisted.flatMap((d) => eventsFor(d, sim.offer.id)),
        );
        for (const decision of decisions) {
          sim.aggregates[scenario.id][decision.decision]++;
          const segment =
            batch.find((p) => p.id === decision.customerId)?.segmentId ??
            "Sem segmento";
          sim.segmentAggregates ??= {};
          sim.segmentAggregates[scenario.id] ??= {};
          sim.segmentAggregates[scenario.id][segment] ??= {
            buy: 0,
            reject: 0,
            undecided: 0,
          };
          sim.segmentAggregates[scenario.id][segment][decision.decision]++;
        }
      }
      sim.processed = start + batch.length;
      await put(workspace, "simulation", id, sim);
      await new Promise((r) => setTimeout(r, 0));
    }
    sim.status = "completed";
    await put(workspace, "simulation", id, sim);
  } catch (e) {
    if (e instanceof EngineVersionError) return;
    const sim = await get<Simulation>(workspace, "simulation", id);
    if (sim) {
      sim.status = "partial_failure";
      sim.error = (e as Error).message;
      await put(workspace, "simulation", id, sim);
    }
  } finally {
    jobs.delete(lock);
  }
}
export async function readBatch(
  workspace: string,
  id: string,
  scenario: string,
  start: number,
) {
  return {
    decisions:
      (await get<CustomerDecision[]>(
        workspace,
        "decisions",
        `${id}:${scenario}:${start}`,
      )) ?? [],
    events:
      (await get<SimulationEvent[]>(
        workspace,
        "events",
        `${id}:${scenario}:${start}`,
      )) ?? [],
  };
}
