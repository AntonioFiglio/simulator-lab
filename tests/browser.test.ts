import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBrowserTrial } from "../services/agents/run";
import {
  personas,
  task,
  agentVersion,
  type TrialRun,
  type AgentAction,
} from "../packages/agent-runtime";
const actions: AgentAction[] = [
  { type: "fill", label: "Serviço", value: "Consulta" },
  { type: "fill", label: "Duração", value: "30" },
  { type: "click", label: "Salvar serviço" },
  { type: "fill", label: "Horário disponível", value: "09:00" },
  { type: "click", label: "Salvar disponibilidade" },
  { type: "fill", label: "Cliente", value: "Cliente fictício" },
  { type: "fill", label: "Horário da reserva", value: "09:00" },
  { type: "click", label: "Confirmar reserva" },
  { type: "click", label: "Confirmar reserva" },
  { type: "finish" },
];
function run(variant: "A" | "B" = "A", persona = personas[0]): TrialRun {
  return {
    id: crypto.randomUUID(),
    version: agentVersion,
    persona,
    task,
    variant,
    status: "running",
    events: [],
    tokens: 0,
    createdAt: new Date().toISOString(),
  };
}
test("six controlled browser episodes complete and duplicate confirmation stays idempotent", async () => {
  const dir = await mkdtemp(join(tmpdir(), "simula-browser-"));
  try {
    for (const p of personas)
      for (const v of ["A", "B"] as const) {
        let i = 0;
        const events: any[] = [];
        const r = await runBrowserTrial(
          run(v, p),
          async () => ({ action: actions[i++], tokens: 1 }),
          async () => true,
          async (e) => {
            events.push(e);
          },
          dir,
        );
        assert.equal(r.outcome, "finished");
        assert.equal(r.evaluation.success, true);
        assert.equal((r.state as any).bookings.length, 1);
        assert.equal(events.length, 10);
        assert.ok(events.every((e) => e.screenshot));
      }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("browser rejects false completion and handles cancellation, timeout and budgets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "simula-limits-"));
  try {
    const next = async () => ({
      action: { type: "finish" } as AgentAction,
      tokens: 1,
    });
    assert.equal(
      (
        await runBrowserTrial(
          run(),
          next,
          async () => true,
          async () => {},
          dir,
        )
      ).evaluation.success,
      false,
    );
    assert.equal(
      (
        await runBrowserTrial(
          run(),
          next,
          async () => false,
          async () => {},
          dir,
        )
      ).outcome,
      "cancelled",
    );
    assert.equal(
      (
        await runBrowserTrial(
          run(),
          async () => ({
            action: { type: "click", label: "Não existe" },
            tokens: 1,
          }),
          async () => true,
          async () => {},
          dir,
          1,
        )
      ).outcome,
      "action_limit",
    );
    assert.equal(
      (
        await runBrowserTrial(
          run(),
          async () => ({ action: { type: "finish" }, tokens: 12001 }),
          async () => true,
          async () => {},
          dir,
        )
      ).outcome,
      "token_limit",
    );
    assert.equal(
      (
        await runBrowserTrial(
          run(),
          next,
          async () => true,
          async () => {},
          dir,
          20,
          1,
        )
      ).outcome,
      "timeout",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
