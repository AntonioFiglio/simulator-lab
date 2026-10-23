import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { get, put, list } from "../../apps/web/lib/db";
import {
  agentEnabled,
  agentVersion,
  personas,
  task,
  eventSchema,
  resultSchema,
  evaluate,
  type TrialRun,
} from "../../packages/agent-runtime";
const locks = new Set<string>();
export function createAgentHandler(storage = { get, put, list }) {
  const { get, put, list } = storage;
  return async function handleAgents(
    req: NextRequest,
    workspace: string,
    path: string[],
  ) {
    const json = (v: unknown, status = 200) =>
      NextResponse.json(v, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    if (req.method === "GET")
      return json({
        enabled: agentEnabled(),
        runs: await list<TrialRun>(workspace, "agent_trial"),
      });
    const id = path[0];
    // Cancellation remains available after disabling the mode.
    if (!agentEnabled() && path[1] !== "cancel" && path[1] !== "result")
      return json({ error: "Modo de agentes desativado." }, 403);
    const lock = workspace + ":agents";
    if (locks.has(lock))
      return json({ error: "Operação em andamento. Tente novamente." }, 409);
    locks.add(lock);
    try {
      if (id === "batch") {
        const existing = await list<TrialRun>(workspace, "agent_trial");
        if (
          existing.some((r) => r.status === "ready" || r.status === "running")
        )
          return json({ error: "Finalize ou cancele o lote ativo." }, 409);
        const runs: TrialRun[] = [];
        for (const persona of personas)
          for (const variant of ["A", "B"] as const) {
            const run: TrialRun = {
              id: randomUUID(),
              version: agentVersion,
              persona,
              task,
              variant,
              status: "ready",
              events: [],
              createdAt: new Date().toISOString(),
              tokens: 0,
            };
            await put(workspace, "agent_trial", run.id, run);
            runs.push(run);
          }
        return json({ runs });
      }
      const run = await get<TrialRun>(workspace, "agent_trial", id);
      if (!run) return json({ error: "Execução não encontrada." }, 404);
      const op = path[1];
      if (op === "cancel") {
        run.cancelRequested = true;
        run.status = "cancelled";
      } else if (op === "claim") {
        if (run.status !== "ready" || run.version !== agentVersion)
          return json({ error: "Execução indisponível ou incompatível." }, 409);
        run.status = "running";
      } else if (op === "event") {
        if (run.status !== "running" || run.cancelRequested)
          return json({ error: "Execução encerrada ou cancelada." }, 409);
        const event = eventSchema.parse(await req.json());
        if (
          event.step !== run.events.length + 1 ||
          run.tokens + event.tokens > 12000
        )
          return json({ error: "Sequência ou orçamento inválido." }, 409);
        run.events.push(event);
        run.tokens += event.tokens;
      } else if (op === "result") {
        if (
          run.status !== "running" &&
          !(run.status === "cancelled" && run.cancelRequested)
        )
          return json({ error: "Execução não está ativa." }, 409);
        const result = resultSchema.parse(await req.json());
        run.outcome = run.cancelRequested ? "cancelled" : result.outcome;
        run.finalState = result.state;
        run.model = result.model;
        run.error = result.error;
        run.durationMs = result.durationMs;
        run.tokens = Math.max(run.tokens, result.tokens ?? 0);
        run.evaluation = evaluate(result.state);
        run.status =
          run.outcome === "cancelled"
            ? "cancelled"
            : run.outcome === "executor_error" || run.outcome === "timeout"
              ? "failed"
              : "completed";
        if (!agentEnabled()) {
          run.status = "cancelled";
          run.outcome = "cancelled";
        }
      } else return json({ error: "Operação inválida." }, 404);
      await put(workspace, "agent_trial", id, run);
      return json({ run });
    } finally {
      locks.delete(lock);
    }
  };
}
export const handleAgents = createAgentHandler();
