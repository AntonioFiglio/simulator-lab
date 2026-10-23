import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
async function main() {
  const token = (await readFile(".simula/session", "utf8")).trim();
  const headers = {
    Cookie: "simula_session=" + token,
    "Content-Type": "application/json",
  };
  const r = await fetch("http://127.0.0.1:3007/api/agents", { headers });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.enabled, false);
  assert.equal(d.runs.length, 12);
  assert.ok(
    d.runs.some(
      (r: any) =>
        r.model === "controlled-no-llm" && r.evaluation.success === false,
    ),
  );
  assert.equal(
    (
      await fetch("http://127.0.0.1:3007/api/agents/batch", {
        method: "POST",
        headers,
        body: "{}",
      })
    ).status,
    403,
  );
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "simula_session",
        value: token,
        url: "http://127.0.0.1:3007",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of [
      "/financials",
      "/customers",
      "/offers/new",
      "/simulations/new",
      "/agents",
    ]) {
      await page.goto("http://127.0.0.1:3007" + path);
      await page
        .getByText("Validação isolada Simulator Lab", { exact: true })
        .waitFor();
    }
    await page.getByRole("heading", { name: "Agentes — piloto" }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Preparar seis execuções" })
        .count(),
      0,
    );
    assert.equal(await page.getByRole("row").count(), 13);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: ".simula/live-ui.png", fullPage: true });
    console.log(
      "PASS: reinício, dados persistidos, modo desligado bloqueia criação e cinco telas autenticadas sem mocks.",
    );
  } finally {
    await browser.close();
  }
}
main().catch(() => {
  console.error("Falha no smoke visual autenticado.");
  process.exitCode = 1;
});
