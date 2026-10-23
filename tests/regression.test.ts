import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateFinancial } from "../packages/financial-engine";
import { parseFile, normalize } from "../packages/ingestion";
import { profileDataset } from "../packages/profiling";
import { decide, eventsFor } from "../packages/simulation-core";
import { understandOffer } from "../packages/offer-understanding";
test("financial scenarios retain fixed volume and monthly costs", () => {
  const s = calculateFinancial({
    product: "Teste",
    month: "2026-10",
    price: 100,
    quantity: 10,
    cost: 500,
    discount: 10,
    costIncrease: 20,
  });
  assert.deepEqual(
    s.map((x) => x.outputs.result),
    [500, 400, 400],
  );
  assert.deepEqual(
    s.map((x) => x.quantitySold),
    [10, 10, 10],
  );
});
for (const ext of ["csv", "xlsx", "xml"])
  test(`example ${ext} imports and profiles`, async () => {
    const rows = await parseFile(
      await readFile(`apps/web/public/examples/historico.${ext}`),
      `historico.${ext}`,
    );
    const mapping = {
      customer_id: "customer_id",
      order_id: "order_id",
      purchased_at: "purchased_at",
      product: "product_name",
      category: "category",
      quantity: "quantity",
      unit_price: "unit_price",
    };
    const d = profileDataset(normalize(rows, mapping, "en-US", "test", "Test"));
    assert.ok(d.profiles.length > 0);
    assert.ok(d.purchases.length > 0);
  });
test("decisions and replay retain original outcomes", () => {
  const p: any = {
    id: "p",
    features: {
      ordersCount: 3,
      usualPriceRange: [20, 100],
      favoriteCategories: ["Teste"],
      daysSinceLastPurchase: 1,
    },
    purchaseHistoryIds: [],
  };
  const s: any = {
    id: "s",
    createdAt: "2026-10-23",
    offer: { id: "o", category: "Teste" },
  };
  const d = decide(p, s, { id: "current", name: "current", price: 80 });
  assert.equal(d.decision, "buy");
  assert.equal(d.affinityScore, 0.95);
  assert.ok(eventsFor(d, "o").some((e) => e.type === "INVENTORY_ITEM_ADDED"));
  const reject = decide(p, s, { id: "other", name: "other", price: 1000 });
  assert.notEqual(reject.decision, "buy");
  assert.ok(
    !eventsFor(reject, "o").some((e) => e.type === "INVENTORY_ITEM_ADDED"),
  );
});
test("local offer requires human review", async () => {
  const o = await understandOffer({
    title: "Teste",
    description: "Descrição completa de teste",
    kind: "service",
    price: 30,
    statedBenefits: [],
  });
  assert.equal(o.humanReviewed, false);
  assert.deepEqual(o.inferredHypotheses, []);
});
