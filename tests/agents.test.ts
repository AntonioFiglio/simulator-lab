import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createAgentHandler } from "../services/agents/api";
import { runSimulation } from "../services/workers/simulation";
import { evaluate, agentEnabled } from "../packages/agent-runtime";
import { engineVersion } from "../packages/simulation-core";
function memory() {
  const m = new Map<string, unknown>();
  const key = (w: string, k: string, id: string) => `${w}:${k}:${id}`;
  return {
    m,
    async get<T>(w: string, k: string, id: string) {
      return structuredClone(m.get(key(w, k, id))) as T | undefined;
    },
    async put(w: string, k: string, id: string, d: unknown) {
      m.set(key(w, k, id), structuredClone(d));
    },
    async list<T>(w: string, k: string) {
      return [...m]
        .filter(([key]) => key.startsWith(`${w}:${k}:`))
        .map(([, v]) => structuredClone(v) as T);
    },
  };
}
test("version mismatch and missing version do not write any simulation state", async () => {
  for (const v of ["old", undefined]) {
    const db = memory();
    await db.put("w", "simulation", "s", {
      engineVersion: v,
      status: "executing",
      processed: 250,
    });
    const before = structuredClone([...db.m]);
    await runSimulation("w", "s", db);
    assert.deepEqual([...db.m], before);
  }
});
test("completed old simulation is readable; compatible job completes", async () => {
  const db = memory();
  await db.put("w", "simulation", "done", {
    status: "completed",
    engineVersion: "old",
  });
  await runSimulation("w", "done", db);
  assert.equal(
    (await db.get<any>("w", "simulation", "done")).status,
    "completed",
  );
  await db.put("w", "simulation", "s", {
    id: "s",
    datasetId: "d",
    engineVersion,
    status: "ready",
    processed: 0,
    segments: [],
    scenarios: [],
    aggregates: {},
  });
  await db.put("w", "dataset", "d", { profiles: [] });
  await runSimulation("w", "s", db);
  assert.equal((await db.get<any>("w", "simulation", "s")).status, "completed");
});
test("agent feature gate, persistence scoping, cancellation and final evaluation", async () => {
  const db = memory(),
    handle = createAgentHandler(db);
  const request = (method: string, body?: unknown) =>
    new NextRequest("http://localhost/api/agents", {
      method,
      ...(body === undefined
        ? {}
        : {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }),
    });
  delete process.env.SIMULA_AGENT_MODE;
  assert.equal(agentEnabled(), false);
  assert.equal((await handle(request("POST"), "one", ["batch"])).status, 403);
  process.env.SIMULA_AGENT_MODE = "true";
  const batch = await (await handle(request("POST"), "one", ["batch"])).json();
  assert.equal(batch.runs.length, 6);
  const id = batch.runs[0].id;
  assert.equal(
    (await handle(request("POST"), "two", [id, "claim"])).status,
    404,
  );
  assert.equal(
    (await handle(request("POST"), "one", [id, "claim"])).status,
    200,
  );
  assert.equal(
    (await handle(request("POST"), "one", [id, "claim"])).status,
    409,
  );
  await handle(request("POST"), "one", [id, "cancel"]);
  delete process.env.SIMULA_AGENT_MODE;
  const result = await handle(
    request("POST", { outcome: "finished", durationMs: 1, model: "test" }),
    "one",
    [id, "result"],
  );
  const data = await result.json();
  assert.equal(data.run.status, "cancelled");
  assert.equal(data.run.evaluation.success, false);
  const read = await (await handle(request("GET"), "one", [])).json();
  assert.equal(read.runs.length, 6);
});
test("independent evaluator rejects missing evidence, wrong duration and duplicate bookings", () => {
  assert.equal(evaluate(undefined).success, false);
  const s = {
    service: "Consulta",
    duration: 30,
    availability: "09:00",
    bookings: [
      { id: "reservation", customer: "Cliente fictício", time: "09:00" },
    ],
  };
  assert.equal(evaluate(s).success, true);
  assert.equal(evaluate({ ...s, duration: 15 }).success, false);
  assert.equal(
    evaluate({ ...s, bookings: [...s.bookings, ...s.bookings] }).success,
    false,
  );
});
