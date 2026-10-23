import { z } from "zod";
import type { FinancialInput, FinancialScenario } from "../contracts";
export const financialSchema = z.object({
  product: z.string().trim().min(1).max(150),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  price: z.number().finite().min(0).max(1e9),
  quantity: z.number().int().min(0).max(1e9),
  cost: z.number().finite().min(0).max(1e12),
  discount: z.number().min(0).max(100),
  costIncrease: z.number().min(0).max(1000),
});
export type FinancialRule = {
  version: string;
  official: boolean;
  calculate: (
    price: number,
    quantity: number,
    cost: number,
  ) => {
    outputs: Record<string, number>;
    calculations: FinancialScenario["calculations"];
  };
};
const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export const provisionalRule: FinancialRule = {
  version: "provisional-monthly-total-v1",
  official: false,
  calculate(price, quantity, cost) {
    const revenue = round(price * quantity),
      result = round(revenue - cost);
    return {
      outputs: { revenue, cost, result },
      calculations: [
        {
          label: "Receita",
          formula: "preço × quantidade",
          substitution: `${price} × ${quantity}`,
          result: revenue,
        },
        {
          label: "Custos totais mensais",
          formula: "custo informado",
          substitution: String(cost),
          result: cost,
        },
        {
          label: "Resultado",
          formula: "receita − custos totais mensais",
          substitution: `${revenue} − ${cost}`,
          result,
        },
      ],
    };
  },
};
// Replace the rule adapter only after receiving the organization's formulas.
export function calculateFinancial(
  raw: FinancialInput,
  rule: FinancialRule = provisionalRule,
): FinancialScenario[] {
  const i = financialSchema.parse(raw);
  const scenarios = (["current", "discount", "cost_increase"] as const).map(
    (name) => {
      const price =
          name === "discount"
            ? round(i.price * (1 - i.discount / 100))
            : i.price,
        cost =
          name === "cost_increase"
            ? round(i.cost * (1 + i.costIncrease / 100))
            : i.cost;
      const computed = rule.calculate(price, i.quantity, cost);
      return {
        id: name,
        name,
        productId: i.product,
        monthRef: i.month,
        price,
        quantitySold: i.quantity,
        cost,
        ...computed,
        deltas: {} as FinancialScenario["deltas"],
      };
    },
  );
  for (const s of scenarios)
    for (const key of Object.keys(s.outputs)) {
      const base = scenarios[0].outputs[key],
        absolute = round(s.outputs[key] - base);
      s.deltas[key] = {
        absolute,
        relative: base === 0 ? null : round((absolute / Math.abs(base)) * 100),
      };
    }
  return scenarios;
}
