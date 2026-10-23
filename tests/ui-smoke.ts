import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/state", (r) =>
      r.fulfill({
        json: {
          workspace: { name: "Teste isolado" },
          datasets: [],
          offers: [],
          simulations: [],
          financials: [],
          segmentDefinitions: {},
          aiConfigured: false,
        },
      }),
    );
    await page.route("**/api/agents", (r) =>
      r.fulfill({ json: { enabled: false, runs: [{id:'controlled-ui',persona:{id:'iniciante'},variant:'A',status:'completed',outcome:'finished',tokens:10,evaluation:{success:true,checks:{service:true}},events:[{step:1,action:{type:'finish'},observation:'Dados salvos.',result:'ok',tokens:10,screenshot:'controlled-ui.png'}]}] } }),
    );
    for (const path of [
      "/financials",
      "/data/import",
      "/customers",
      "/offers/new",
      "/simulations/new",
      "/agents",
    ]) {
      await page.goto("http://127.0.0.1:3007" + path);
      await page.getByText("Teste isolado", { exact: true }).waitFor();
      if (path === "/agents") {
        await page.getByRole("heading", { name: "Agentes — piloto" }).waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "Preparar seis execuções" })
            .count(),
          0,
        );
      }
    }
    await mkdir(".simula", { recursive: true });
    await page.screenshot({ path: ".simula/ui-agents.png" });
    assert.deepEqual(errors, []);
    const unauthorized = await fetch("http://127.0.0.1:3007/api/agents");
    assert.equal(unauthorized.status, 401);
    console.log(
      "UI: six routes rendered with mocked data, zero page errors; feature disabled; live API rejects missing session.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
