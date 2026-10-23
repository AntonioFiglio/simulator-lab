export type Decision = "buy" | "reject" | "undecided";
export type EvidenceType = "observed" | "assumption" | "ai_hypothesis";
export type Purchase = {
  id: string;
  customerId?: string;
  orderId: string;
  purchasedAt: string;
  product: string;
  category?: string;
  quantity: number;
  unitPrice: number;
};
export type CustomerProfile = {
  id: string;
  segmentId?: string;
  features: {
    ordersCount: number;
    totalSpent: number;
    averageOrderValue: number;
    daysSinceLastPurchase?: number;
    favoriteCategories: string[];
    usualPriceRange?: [number, number];
  };
  purchaseHistoryIds: string[];
  datasetVersion: string;
};
export type Dataset = {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  referenceDate: string;
  purchases: Purchase[];
  profiles: CustomerProfile[];
  mapping: Record<string, string>;
  quality: {
    total: number;
    accepted: number;
    duplicates: number;
    rejected: number;
    unidentified: number;
    issues: string[];
  };
  synthetic: boolean;
};
export type OfferSpec = {
  id: string;
  title: string;
  description: string;
  kind: "physical" | "digital" | "service" | "subscription";
  category?: string;
  price: number;
  unitCost?: number;
  statedBenefits: string[];
  inferredHypotheses: string[];
  humanReviewed: boolean;
  targetAudience?: string;
  provider?: string;
  unknowns?: string[];
};
export type CustomerDecision = {
  simulationId: string;
  scenarioId: string;
  customerId: string;
  decision: Decision;
  affinityScore?: number;
  reasons: { text: string; basis: EvidenceType; sourceIds?: string[] }[];
  modelVersion: string;
  createdAt: string;
};
export type SimulationEvent = {
  type:
    | "AVATAR_SPAWN"
    | "AVATAR_MOVE"
    | "OFFER_INSPECTED"
    | "DECISION_SHOWN"
    | "INVENTORY_ITEM_ADDED"
    | "AVATAR_EXIT";
  at: number;
  customerId: string;
  waypoint?: string;
  offerId?: string;
  decision?: Decision;
};
export type FinancialInput = {
  product: string;
  month: string;
  price: number;
  quantity: number;
  cost: number;
  discount: number;
  costIncrease: number;
};
export type FinancialScenario = {
  id: string;
  name: "current" | "discount" | "cost_increase";
  productId: string;
  monthRef: string;
  price: number;
  quantitySold: number;
  cost: number;
  outputs: Record<string, number>;
  calculations: {
    label: string;
    formula: string;
    substitution: string;
    result: number;
  }[];
  deltas: Record<string, { absolute: number; relative: number | null }>;
};
export type FinancialAnalysis = {
  id: string;
  simulationId?: string;
  input: FinancialInput;
  scenarios: FinancialScenario[];
  ruleVersion: string;
  official: boolean;
  createdAt: string;
};
export type Simulation = {
  id: string;
  offer: OfferSpec;
  datasetId: string;
  datasetSynthetic?: boolean;
  datasetVersion: string;
  engineVersion: string;
  seed: number;
  segments: string[];
  status: "ready" | "executing" | "completed" | "partial_failure";
  processed: number;
  total: number;
  error?: string;
  createdAt: string;
  financialParameters?: { discount: number; costIncrease: number };
  scenarios: { id: string; name: string; price: number; unitCost?: number }[];
  segmentAggregates?: Record<string, Record<string, Record<Decision, number>>>;
  aggregates: Record<string, Record<Decision, number>>;
};
export const caveat =
  "Aceitação sintética não é conversão real. Históricos de compras não registram todas as exposições, recusas ou oportunidades; estas regras não demonstram causalidade.";
export const scenarioLabels = {
  current: "Atual",
  discount: "Desconto comercial",
  cost_increase: "Aumento de custos",
};
