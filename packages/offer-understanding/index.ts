import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { OfferSpec } from "../contracts";
export const offerSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(10).max(4000),
  kind: z.enum(["physical", "digital", "service", "subscription"]),
  category: z.string().max(100).optional(),
  price: z.number().min(0).max(1e9),
  unitCost: z.number().min(0).max(1e9).optional(),
  statedBenefits: z.array(z.string().max(400)).max(20),
  targetAudience: z.string().max(300).optional(),
});
export interface OfferProvider {
  interpret(
    input: z.infer<typeof offerSchema>,
  ): Promise<Pick<OfferSpec, "inferredHypotheses" | "unknowns" | "provider">>;
}
const localProvider: OfferProvider = {
  async interpret(input) {
    return {
      provider: "Estruturação local (sem IA externa)",
      inferredHypotheses: [],
      unknowns: [
        ...(!input.category ? ["Categoria desconhecida"] : []),
        ...(input.unitCost === undefined ? ["Custo desconhecido"] : []),
        ...(!input.statedBenefits.length ? ["Benefícios não informados"] : []),
      ],
    };
  },
};
const remoteProvider: OfferProvider = {
  async interpret(input) {
    const response = await fetch(process.env.OFFER_AI_URL!, {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OFFER_AI_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: process.env.OFFER_AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Estruture a oferta em JSON com inferredHypotheses (array de hipóteses explicitamente especulativas) e unknowns (array de lacunas). Não invente fatos, benefícios, certificações ou evidências. Não altere preço ou campos declarados.",
          },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 700,
      }),
    });
    if (!response.ok)
      throw Error(
        "O provedor de IA não respondeu. Tente novamente ou desative a configuração para estruturação local.",
      );
    const data = await response.json();
    const parsed = z
      .object({
        inferredHypotheses: z.array(z.string().max(500)).max(10),
        unknowns: z.array(z.string().max(500)).max(10),
      })
      .parse(JSON.parse(data.choices[0].message.content));
    return {
      ...parsed,
      provider: "IA externa configurada; somente texto da oferta enviado",
    };
  },
};
export async function understandOffer(raw: unknown): Promise<OfferSpec> {
  const input = offerSchema.parse(raw);
  const interpreted = await (
    process.env.OFFER_AI_URL ? remoteProvider : localProvider
  ).interpret(input);
  return { ...input, ...interpreted, id: randomUUID(), humanReviewed: false };
}
