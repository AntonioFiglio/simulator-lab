import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { get, put } from "../apps/web/lib/db";
const base = "http://127.0.0.1:3007";
async function main() {
  async function session() {
    const r = await fetch(base + "/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Validação isolada Simulator Lab" }),
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0];
  }
  const cookie = await session(),
    other = await session();
  async function request(path: string, body?: unknown, c = cookie) {
    return fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Cookie: c,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  }
  async function api(path: string, body?: unknown, c = cookie) {
    const r = await request(path, body, c);
    assert.ok(r.ok, `${path}: HTTP ${r.status}`);
    return r.json();
  }
  try {
    const f = await api("financial", {
      product: "Teste",
      month: "2026-10",
      price: 100,
      quantity: 10,
      cost: 500,
      discount: 10,
      costIncrease: 20,
    });
    assert.deepEqual(
      f.scenarios.map((s: any) => s.outputs.result),
      [500, 400, 400],
    );
    let datasetId = "";
    for (const ext of ["csv", "xlsx", "xml"]) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([await readFile(`apps/web/public/examples/historico.${ext}`)]),
        `historico.${ext}`,
      );
      const preview = await api("import/preview", form);
      const d = await api("import/confirm", {
        id: preview.id,
        mapping: {
          customer_id: "customer_id",
          order_id: "order_id",
          purchased_at: "purchased_at",
          product: "product_name",
          quantity: "quantity",
          unit_price: "unit_price",
          category: "category",
        },
        locale: "en-US",
      });
      datasetId = d.id;
      assert.ok((await api("customers?dataset=" + datasetId)).total > 0);
    }
    const input = {
      title: "Teste de serviço",
      description: "Descrição completa para validação isolada",
      kind: "service",
      category: "Bem-estar",
      price: 30,
      statedBenefits: [],
    };
    const interpreted = await api("offer/interpret", input);
    assert.equal(interpreted.humanReviewed, false);
    const offer = await api("offer/review", {
      ...interpreted,
      humanReviewed: true,
    });
    let sim = await api("simulation", {
      datasetId,
      offerId: offer.id,
      segments: [],
      seed: 1,
      discount: 10,
      costIncrease: 20,
    });
    for (let n = 0; n < 60 && sim.status !== "completed"; n++) {
      await new Promise((r) => setTimeout(r, 250));
      sim = await api("simulation/" + sim.id);
    }
    assert.equal(sim.status, "completed");
    assert.equal(sim.processed, sim.total);
    for (const totals of Object.values(sim.aggregates) as any[])
      assert.equal(totals.buy + totals.reject + totals.undecided, sim.total);
    const replay = await api(
      "simulation/" + sim.id + "/replay?scenario=current",
    );
    assert.ok(JSON.stringify(replay).includes("DECISION_SHOWN"));
    await api("simulation/" + sim.id + "/resume", {});
    assert.equal((await api("simulation/" + sim.id)).processed, sim.processed);
    const state = await api("state");
    assert.equal(state.datasets.length, 3);
    assert.equal(state.financials.length, 1);
    assert.equal(state.offers.length, 1);
    assert.equal((await api("state", undefined, other)).datasets.length, 0);
    assert.equal(
      (await request("simulation/" + sim.id, undefined, other)).status,
      404,
    );
    const workspace = createHash("sha256")
      .update(cookie.split("=")[1])
      .digest("hex");
    await put(workspace, "simulation", sim.id, {
      ...sim,
      status: "executing",
      engineVersion: "incompatible-test",
    });
    const before = await get(workspace, "simulation", sim.id);
    assert.equal(
      (await request("simulation/" + sim.id + "/resume", {})).status,
      400,
    );
    assert.deepEqual(await get(workspace, "simulation", sim.id), before);
    await put(workspace, "simulation", sim.id, sim);
    const batch = await api("agents/batch", {});
    assert.equal(batch.runs.length, 6);
    assert.equal(
      (await request("agents/" + batch.runs[0].id + "/claim", {}, other))
        .status,
      404,
    );
    const id = batch.runs[0].id;
    await api("agents/" + id + "/claim", {});
    await api("agents/" + id + "/event", {
      step: 1,
      action: { type: "finish" },
      observation: "Teste controlado",
      result: "ok",
      tokens: 1,
    });
    await api("agents/" + id + "/result", {
      outcome: "finished",
      durationMs: 1,
      model: "controlled-no-llm",
    });
    let persisted = (await api("agents")).runs.find((r: any) => r.id === id);
    assert.equal(persisted.events.length, 1);
    assert.equal(persisted.evaluation.success, false);
    for (const r of batch.runs.slice(1))
      await api("agents/" + r.id + "/cancel", {});
    assert.equal((await api("agents")).runs.length, 6);
    // Leave a fresh batch for the separately configured real model.
    await api("agents/batch", {});
    await writeFile(".simula/session", cookie.split("=")[1], { mode: 0o600 });
    await writeFile(
      ".simula/live-result.json",
      JSON.stringify(
        {
          passed: true,
          checks: [
            "financial",
            "csv",
            "xlsx",
            "xml",
            "profiling",
            "offer-review",
            "simulation",
            "replay",
            "completed-resume",
            "incompatible-resume-no-write",
            "reload",
            "workspace-isolation",
            "agent-persistence",
            "independent-evaluator",
          ],
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: Supabase real — 14 verificações; lote IA preparado e sessão preservada localmente.",
    );
  } finally {
    await api("privacy/delete", {}, other);
  }
}
main().catch(() => {
  console.error("Smoke autenticado falhou; nenhuma credencial exibida.");
  process.exitCode = 1;
});
