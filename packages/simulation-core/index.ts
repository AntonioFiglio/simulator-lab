import type {
  CustomerProfile,
  CustomerDecision,
  Simulation,
  SimulationEvent,
} from "../contracts";
export const engineVersion = "heuristic-evidence-v1";
export function decide(
  profile: CustomerProfile,
  sim: Simulation,
  scenario: Simulation["scenarios"][number],
): CustomerDecision {
  const f = profile.features,
    range = f.usualPriceRange,
    categoryMatch =
      !!sim.offer.category &&
      f.favoriteCategories.some(
        (c) => c.toLowerCase() === sim.offer.category!.toLowerCase(),
      );
  const ratio = range && range[1] > 0 ? scenario.price / range[1] : null;
  let score = 0.5;
  if (categoryMatch) score += 0.2;
  if (ratio !== null) {
    if (ratio <= 1) score += 0.15;
    else if (ratio > 1.5) score -= 0.35;
  }
  if (f.ordersCount >= 3) score += 0.1;
  if ((f.daysSinceLastPurchase ?? 0) > 90) score -= 0.25;
  score = Math.max(0, Math.min(1, score));
  const decision =
    ratio === null || !sim.offer.category || !f.favoriteCategories.length
      ? "undecided"
      : score >= 0.7
        ? "buy"
        : score <= 0.35
          ? "reject"
          : "undecided";
  return {
    simulationId: sim.id,
    scenarioId: scenario.id,
    customerId: profile.id,
    decision,
    affinityScore: score,
    modelVersion: engineVersion,
    createdAt: sim.createdAt,
    reasons: [
      {
        text: `${f.ordersCount} pedidos; faixa unitária observada ${range ? range.join("–") : "desconhecida"}; recência ${f.daysSinceLastPurchase ?? "desconhecida"} dias.`,
        basis: "observed",
        sourceIds: profile.purchaseHistoryIds.slice(0, 10),
      },
      {
        text: sim.offer.category
          ? `Categoria ${sim.offer.category}: ${categoryMatch ? "presente" : "não identificada"} no histórico.`
          : "Categoria da oferta desconhecida.",
        basis: "observed",
        sourceIds: profile.purchaseHistoryIds.slice(0, 10),
      },
      {
        text: "Regra exploratória: base 0,50; categoria +0,20; preço dentro da faixa +0,15 ou acima de 1,5× −0,35; recorrência +0,10; inatividade −0,25. Aceita ≥0,70; rejeita ≤0,35; demais indecisos. Custo não altera a reação do consumidor. Não calibrado.",
        basis: "assumption",
      },
    ],
  };
}
export function eventsFor(
  decision: CustomerDecision,
  offerId: string,
): SimulationEvent[] {
  const customerId = decision.customerId;
  const events: SimulationEvent[] = [
    { type: "AVATAR_SPAWN", at: 0, customerId },
    { type: "AVATAR_MOVE", at: 1000, customerId, waypoint: "offer" },
    { type: "OFFER_INSPECTED", at: 3000, customerId, offerId },
    {
      type: "DECISION_SHOWN",
      at: 5000,
      customerId,
      decision: decision.decision,
    },
  ];
  if (decision.decision === "buy")
    events.push({
      type: "INVENTORY_ITEM_ADDED",
      at: 5500,
      customerId,
      offerId,
    });
  events.push(
    { type: "AVATAR_MOVE", at: 6500, customerId, waypoint: decision.decision },
    { type: "AVATAR_EXIT", at: 10000, customerId },
  );
  return events;
}
