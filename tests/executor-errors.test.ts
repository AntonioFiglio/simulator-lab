import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { NextRequest } from "next/server";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBrowserTrial } from "../services/agents/run";
import { createAgentHandler } from "../services/agents/api";
import {
  agentVersion,
  personas,
  task,
  resultSchema,
  type TrialRun,
} from "../packages/agent-runtime";

function trial(): TrialRun {
  return {
    id: crypto.randomUUID(),
    version: agentVersion,
    persona: personas[0],
    task,
    variant: "A",
    status: "ready",
    events: [],
    tokens: 0,
    createdAt: new Date().toISOString(),
  };
}

// Exercise the real claim/result handler without external storage or LLM calls.
async function lifecycle(run: TrialRun) {
  const records = new Map<string, unknown>();
  const storage = {
    async get<T>(w: string, k: string, id: string) {
      return structuredClone(records.get(`${w}:${k}:${id}`)) as T | undefined;
    },
    async put(w: string, k: string, id: string, value: unknown) {
      records.set(`${w}:${k}:${id}`, structuredClone(value));
    },
    async list<T>(w: string, k: string) {
      return [...records]
        .filter(([key]) => key.startsWith(`${w}:${k}:`))
        .map(([, value]) => structuredClone(value) as T);
    },
  };
  await storage.put("test", "agent_trial", run.id, run);
  const handler = createAgentHandler(storage);
  const post = (path: string[], body: unknown) =>
    handler(
      new NextRequest("http://localhost/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      "test",
      path,
    );
  assert.equal((await post([run.id, "claim"], {})).status, 200);
  return {
    async finish(result: Awaited<ReturnType<typeof runBrowserTrial>>) {
      const payload = resultSchema.parse({
        outcome: result.outcome,
        state: result.state,
        error: result.error,
        tokens: result.tokens,
        durationMs: result.durationMs,
        model: "controlled-test",
      });
      assert.equal((await post([run.id, "result"], payload)).status, 200);
      const saved = await storage.get<TrialRun>("test", "agent_trial", run.id);
      assert.equal(saved?.status, "failed");
      assert.equal(saved?.outcome, "executor_error");
      assert.equal(saved?.evaluation?.success, false);
      assert.equal(saved?.tokens, result.tokens);
      assert.equal((await post(["batch"], {})).status, 200);
    },
    async record(event: TrialRun["events"][number]) {
      assert.equal((await post([run.id, "event"], event)).status, 200);
    },
  };
}

test("browser startup failure returns a persistable error and releases the trial", async (t) => {
  const previous = process.env.SIMULA_AGENT_MODE;
  process.env.SIMULA_AGENT_MODE = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.SIMULA_AGENT_MODE;
    else process.env.SIMULA_AGENT_MODE = previous;
  });
  const run = trial(),
    store = await lifecycle(run);
  t.mock.method(chromium, "launch", async () => {
    throw Error("Controlled launch failure");
  });
  const result = await runBrowserTrial(
    run,
    async () => {
      assert.fail("Provider must not be called when browser startup fails");
    },
    async () => true,
    store.record,
    tmpdir(),
  );
  assert.equal(result.outcome, "executor_error");
  assert.equal(result.tokens, 0);
  assert.equal(result.state, undefined);
  await store.finish(result);
});

for (const invalid of [
  -1,
  0.5,
  NaN,
  Infinity,
  "9",
  24000,
  24001,
  Number.MAX_SAFE_INTEGER,
]) {
  test(`unpersistable token usage ${String(invalid)} preserves the last valid total and releases the trial`, async (t) => {
    const previous = process.env.SIMULA_AGENT_MODE;
    process.env.SIMULA_AGENT_MODE = "true";
    t.after(() => {
      if (previous === undefined) delete process.env.SIMULA_AGENT_MODE;
      else process.env.SIMULA_AGENT_MODE = previous;
    });
    const dir = await mkdtemp(join(tmpdir(), "simula-metering-"));
    try {
      const run = trial(),
        store = await lifecycle(run);
      let calls = 0;
      const result = await runBrowserTrial(
        run,
        async () =>
          ++calls === 1
            ? {
                action: { type: "fill", label: "Serviço", value: "Consulta" },
                tokens: 7,
              }
            : { action: { type: "finish" }, tokens: invalid as number },
        async () => true,
        store.record,
        dir,
      );
      assert.equal(calls, 2);
      assert.equal(result.outcome, "executor_error");
      assert.equal(result.tokens, 7);
      await store.finish(result);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
