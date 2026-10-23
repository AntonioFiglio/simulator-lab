import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { get, put } from "./db";
import {
  emptyChat,
  draftSchema,
  offerFromDraft,
  nextOfferTurn,
  transcribeOffer,
  type OfferChat,
} from "@packages/offer-understanding/chat";

// Same single-replica constraint as the simulation worker. Protects revisions and cost limits.
const globalState = globalThis as unknown as { offerRequests?: Set<string> };
const requests = (globalState.offerRequests ??= new Set<string>());
export function offerChatBusy(workspace: string) {
  return requests.has(workspace);
}
export async function handleOfferChat(
  req: Request,
  workspace: string,
  action: string,
) {
  const read = async () =>
    (await get<OfferChat>(workspace, "offer_chat", "current")) ?? emptyChat();
  if (req.method === "GET" && action === "offer/chat") return read();
  if (req.method !== "POST") throw Error("Método não permitido.");
  if (requests.has(workspace))
    throw Error("Aguarde a solicitação atual terminar.");
  requests.add(workspace);
  try {
    const budget = await get<{ since: number; count: number }>(
      workspace,
      "offer_usage",
      "hour",
    );
    const usage =
      budget && Date.now() - budget.since < 3600000
        ? budget
        : { since: Date.now(), count: 0 };
    if (action === "offer/transcribe") {
      if (usage.count >= 60)
        throw Error("Limite de 60 solicitações de IA por hora atingido.");
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof File)) throw Error("Áudio ausente.");
      await put(workspace, "offer_usage", "hour", {
        ...usage,
        count: usage.count + 1,
      });
      return await transcribeOffer(file);
    }
    const body = z
      .object({
        revision: z.number().int().min(0),
        message: z.string().trim().min(1).max(4000).optional(),
        reset: z.boolean().optional(),
        confirm: z.boolean().optional(),
        draft: draftSchema.optional(),
      })
      .parse(await req.json());
    const chat = await read();
    if (body.revision !== chat.revision)
      throw Error("A conversa mudou em outra aba. Recarregue para continuar.");
    if (body.reset) {
      const fresh = { ...emptyChat(), revision: chat.revision + 1 };
      await put(workspace, "offer_chat", "current", fresh);
      return fresh;
    }
    if (body.confirm) {
      if (chat.confirmedOfferId) return { offerId: chat.confirmedOfferId };
      if (!body.draft) throw Error("Revise a ficha antes de confirmar.");
      const spec = offerFromDraft(body.draft);
      // Stable per revision: retry after a partial persistence failure does not duplicate an offer.
      const hash = createHash("sha256")
        .update(workspace + ":offer:" + chat.revision)
        .digest("hex");
      const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      await put(workspace, "offer", id, {
        ...spec,
        id,
        humanReviewed: true,
        provider:
          chat.messages.length > 1
            ? "GPT-4o-mini; ficha revisada pelo usuário"
            : "Ficha preenchida manualmente e revisada pelo usuário",
        inferredHypotheses: [],
        unknowns: [
          ...(!spec.category ? ["Categoria desconhecida"] : []),
          ...(spec.unitCost === undefined ? ["Custo desconhecido"] : []),
        ],
      });
      await put(workspace, "offer_chat", "current", {
        ...chat,
        draft: body.draft,
        confirmedOfferId: id,
      });
      return { offerId: id };
    }
    if (chat.confirmedOfferId)
      throw Error("Esta oferta já foi confirmada. Comece uma nova conversa.");
    if (!body.message) throw Error("Escreva uma mensagem.");
    if (usage.count >= 60)
      throw Error("Limite de 60 solicitações de IA por hora atingido.");
    await put(workspace, "offer_usage", "hour", {
      ...usage,
      count: usage.count + 1,
    });
    const next = await nextOfferTurn(
      body.draft ? { ...chat, draft: body.draft } : chat,
      body.message,
    );
    await put(workspace, "offer_chat", "current", next);
    return next;
  } finally {
    requests.delete(workspace);
  }
}
