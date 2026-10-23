import type { Dataset, CustomerProfile, Purchase } from "../contracts";
export const segmentDefinitions: Record<string, string> = {
  Recorrentes:
    "3 ou mais pedidos; sem critério prioritário de inatividade, diversidade ou ticket alto.",
  "Faixa habitual de preço":
    "Menos de 3 pedidos, sem critério de inatividade, diversidade ou ticket alto.",
  "Ticket alto": "Ticket médio no quartil superior, acima da mediana.",
  Exploradores: "Compras em pelo menos 3 categorias.",
  Inativos:
    "Mais de 90 dias desde a última compra, em relação à última data do arquivo.",
};
export function profileDataset(dataset: Dataset): Dataset {
  const groups = new Map<string, Purchase[]>();
  for (const p of dataset.purchases) {
    if (!p.customerId) continue;
    const list = groups.get(p.customerId) ?? [];
    list.push(p);
    groups.set(p.customerId, list);
  }
  const profiles: CustomerProfile[] = [...groups].map(([id, rows]) => {
    const ordersCount = new Set(rows.map((r) => r.orderId)).size,
      totalSpent = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
    return {
      id,
      datasetVersion: dataset.version,
      purchaseHistoryIds: rows.map((r) => r.id),
      features: {
        ordersCount,
        totalSpent,
        averageOrderValue: totalSpent / ordersCount,
        daysSinceLastPurchase: Math.floor(
          (+new Date(dataset.referenceDate) -
            Math.max(...rows.map((r) => +new Date(r.purchasedAt)))) /
            86400000,
        ),
        favoriteCategories: [
          ...new Set(
            rows.map((r) => r.category).filter((v): v is string => !!v),
          ),
        ],
        usualPriceRange: [
          Math.min(...rows.map((r) => r.unitPrice)),
          Math.max(...rows.map((r) => r.unitPrice)),
        ],
      },
    };
  });
  const values = profiles
      .map((p) => p.features.averageOrderValue)
      .sort((a, b) => a - b),
    median = values[Math.floor(values.length * 0.5)] ?? 0,
    high = values[Math.floor(values.length * 0.75)] ?? 0;
  for (const p of profiles) {
    const f = p.features;
    p.segmentId =
      (f.daysSinceLastPurchase ?? 0) > 90
        ? "Inativos"
        : f.favoriteCategories.length >= 3
          ? "Exploradores"
          : f.averageOrderValue >= high && f.averageOrderValue > median
            ? "Ticket alto"
            : f.ordersCount >= 3
              ? "Recorrentes"
              : "Faixa habitual de preço";
  }
  return { ...dataset, profiles };
}
