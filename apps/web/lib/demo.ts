import { normalize } from "../../../packages/ingestion";
import { profileDataset } from "../../../packages/profiling";
export function demoDataset(salt: string) {
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < 5000; i++) {
    const group = i % 5,
      count = group === 0 ? 4 : group === 3 ? 3 : 1;
    for (let j = 0; j < count; j++)
      rows.push({
        customer_id: `ficticio-${i}`,
        order_id: `pedido-${i}-${j}`,
        purchased_at:
          group === 4
            ? "2026-01-05"
            : `2026-10-${String(10 + j).padStart(2, "0")}`,
        product: `Item fictício ${j}`,
        category:
          group === 3
            ? ["Bem-estar", "Educação", "Tecnologia"][j]
            : "Bem-estar",
        quantity: "1",
        unit_price: String(group === 1 ? 20 : group === 2 ? 200 : 60),
      });
  }
  const mapping = Object.fromEntries(
    [
      "customer_id",
      "order_id",
      "purchased_at",
      "product",
      "category",
      "quantity",
      "unit_price",
    ].map((k) => [k, k]),
  );
  const d = profileDataset(
    normalize(rows, mapping, "en-US", salt, "Empresa fictícia · 5.000 perfis"),
  );
  d.synthetic = true;
  return d;
}
