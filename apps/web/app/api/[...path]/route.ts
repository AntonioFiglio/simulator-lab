import { handleOfferChat, offerChatBusy } from "@/lib/offer-chat";
import { assertEngineVersion } from "../../../../../packages/simulation-core/version";
import { handleAgents } from "../../../../../services/agents/api";
import { NextRequest, NextResponse, after } from "next/server";
import {
  randomBytes,
  randomUUID,
  createHash,
} from "node:crypto";
import { z } from "zod";
import { get, put, list, remove } from "@/lib/db";
import { StorageError } from "@/lib/supabase";
import { parseFile, normalize, type RawRow } from "@packages/ingestion";
import { profileDataset, segmentDefinitions } from "@packages/profiling";
import {
  calculateFinancial,
  financialSchema,
  provisionalRule,
} from "@packages/financial-engine";
import { understandOffer, offerSchema } from "@packages/offer-understanding";
import { engineVersion } from "@packages/simulation-core";
import {
  runSimulation,
  readBatch,
  workspaceBusy,
} from "../../../../../services/workers/simulation";
import { demoDataset } from "@/lib/demo";
import type {
  Dataset,
  OfferSpec,
  Simulation,
  FinancialAnalysis,
  CustomerDecision,
} from "@packages/contracts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await context.params).path;
    const action = path.join("/");
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      if (origin && new URL(origin).host !== req.headers.get("host"))
        return NextResponse.json(
          { error: "Origem não permitida." },
          { status: 403 },
        );
      if (Number(req.headers.get("content-length") ?? 0) > 12 * 1024 * 1024)
        throw Error("Limite de upload excedido.");
    }
    let token = req.cookies.get("simula_session")?.value;
    if (action === "session" && req.method === "POST") {
      const body = await req.json();
      token = randomBytes(32).toString("hex");
      const workspace = digest(token);
      await put(workspace, "workspace", "info", {
        name: String(body.name ?? "Meu laboratório").slice(0, 80),
        createdAt: new Date().toISOString(),
        role: "owner",
      });
      const res = NextResponse.json({ ok: true });
      res.cookies.set("simula_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return NextResponse.json(
        { error: "Abra um workspace para continuar." },
        { status: 401 },
      );
    const workspace = digest(token);
    const info = await get<{ name: string }>(workspace, "workspace", "info");
    if (!info)
      return NextResponse.json(
        { error: "Workspace indisponível." },
        { status: 401 },
      );
    const json = (v: unknown) =>
      NextResponse.json(v, {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    if (path[0] === "agents")
      return handleAgents(req, workspace, path.slice(1));
    if (action === "offer/chat" || action === "offer/transcribe")
      return json(await handleOfferChat(req, workspace, action));
    if (action === "state") {
      const uploads = await list<{ createdAt: number }>(workspace, "upload");
      if (uploads.some((u) => Date.now() - u.createdAt > 3600000))
        await remove(workspace, "upload");
      const datasets = (await list<Dataset>(workspace, "dataset")).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt),
      );
      return json({
        workspace: info,
        datasets: datasets.map(({ purchases, profiles, ...d }) => ({
          ...d,
          profileCount: profiles.length,
          segments: Object.fromEntries(
            [...new Set(profiles.map((p) => p.segmentId ?? ""))].map((s) => [
              s,
              profiles.filter((p) => p.segmentId === s).length,
            ]),
          ),
          categories: [
            ...new Set(purchases.map((p) => p.category).filter(Boolean)),
          ],
          anonymousCategories: Object.fromEntries(
            [
              ...new Set(
                purchases
                  .filter((p) => !p.customerId)
                  .map((p) => p.category ?? "Desconhecida"),
              ),
            ].map((c) => [
              c,
              purchases.filter(
                (p) => !p.customerId && (p.category ?? "Desconhecida") === c,
              ).length,
            ]),
          ),
        })),
        offers: await list<OfferSpec>(workspace, "offer"),
        simulations: await list<Simulation>(workspace, "simulation"),
        financials: await list<FinancialAnalysis>(workspace, "financial"),
        segmentDefinitions,
        aiConfigured: !!process.env.OPENAI_API_KEY,
      });
    }
    if (action === "financial" && req.method === "POST") {
      const body = await req.json();
      const input = financialSchema.parse(body);
      const simulationId = z.string().uuid().optional().parse(body.simulationId);
      if (simulationId && !await get<Simulation>(workspace, "simulation", simulationId))
        throw Error("Simulação não encontrada neste workspace.");
      const result: FinancialAnalysis = {
        id: randomUUID(),
        simulationId,
        input,
        scenarios: calculateFinancial(input),
        ruleVersion: provisionalRule.version,
        official: provisionalRule.official,
        createdAt: new Date().toISOString(),
      };
      await put(workspace, "financial", result.id, result);
      return json(result);
    }
    if (action === "import/preview" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw Error("Selecione um arquivo.");
      const rows = await parseFile(
        Buffer.from(await file.arrayBuffer()),
        file.name,
      );
      const id = randomUUID();
      await remove(workspace, "upload");
      await put(workspace, "upload", id, {
        rows,
        name: file.name,
        createdAt: Date.now(),
      });
      return json({
        id,
        name: file.name,
        columns: Object.keys(rows[0]),
        preview: rows.slice(0, 8),
        total: rows.length,
      });
    }
    if (action === "import/confirm" && req.method === "POST") {
      const body = z
        .object({
          id: z.string().uuid(),
          mapping: z.record(z.string(), z.string()),
          locale: z.enum(["pt-BR", "en-US"]),
        })
        .parse(await req.json());
      const upload = await get<{
        rows: RawRow[];
        name: string;
        createdAt: number;
      }>(workspace, "upload", body.id);
      if (!upload || Date.now() - upload.createdAt > 3600000)
        throw Error("Prévia expirada. Envie o arquivo novamente.");
      const dataset = profileDataset(
        normalize(
          upload.rows,
          body.mapping,
          body.locale,
          workspace,
          upload.name,
        ),
      );
      await put(workspace, "dataset", dataset.id, dataset);
      await remove(workspace, "upload");
      return json({ id: dataset.id });
    }
    if (action === "preset" && req.method === "POST") {
      const existing = await list<Dataset>(workspace, "dataset");
      if (existing.length || info.name.trim() !== "Meu laboratório")
        return json({ created: false });
      const dataset = demoDataset(workspace);
      // A fixed ID keeps repeated initialization requests from creating extra bases.
      dataset.id = "preset-demo-v1";
      await put(workspace, "dataset", dataset.id, dataset);
      return json({ created: true, id: dataset.id });
    }
    if (action === "demo" && req.method === "POST") {
      const dataset = demoDataset(workspace);
      await put(workspace, "dataset", dataset.id, dataset);
      return json({ id: dataset.id });
    }
    if (action === "customers") {
      const id = req.nextUrl.searchParams.get("dataset") ?? "";
      const d = await get<Dataset>(workspace, "dataset", id);
      if (!d) throw Error("Base não encontrada.");
      const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase(),
        segment = req.nextUrl.searchParams.get("segment");
      const profiles = d.profiles.filter(
        (p) =>
          (!segment || p.segmentId === segment) &&
          p.id.toLowerCase().includes(q),
      );
      const offset = Math.max(
        0,
        Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0,
      );
      return json({
        profiles: profiles.slice(offset, offset + 50),
        total: profiles.length,
      });
    }
    if (action === "customer") {
      const d = await get<Dataset>(
        workspace,
        "dataset",
        req.nextUrl.searchParams.get("dataset") ?? "",
      );
      const p = d?.profiles.find(
        (p) => p.id === req.nextUrl.searchParams.get("id"),
      );
      if (!d || !p) throw Error("Perfil não encontrado.");
      return json({
        profile: p,
        history: d.purchases.filter((h) => h.customerId === p.id),
      });
    }
    if (action === "offer/interpret" && req.method === "POST") {
      return json(await understandOffer(await req.json()));
    }
    if (action === "offer/review" && req.method === "POST") {
      const body = await req.json();
      if (body.humanReviewed !== true)
        throw Error("Revise e confirme a interpretação.");
      const parsed = offerSchema.parse(body);
      const offer: OfferSpec = {
        ...parsed,
        id: randomUUID(),
        humanReviewed: true,
        inferredHypotheses: z
          .array(z.string().max(500))
          .max(10)
          .parse(body.inferredHypotheses ?? []),
        provider: String(body.provider ?? "Revisão humana").slice(0, 150),
        unknowns: z
          .array(z.string().max(500))
          .max(10)
          .parse(body.unknowns ?? []),
      };
      await put(workspace, "offer", offer.id, offer);
      return json(offer);
    }
    if (action === "simulation" && req.method === "POST") {
      if (workspaceBusy(workspace))
        throw Error("Aguarde a simulação atual terminar.");
      const body = z
        .object({
          datasetId: z.string().uuid(),
          offerId: z.string().uuid(),
          segments: z.array(z.string()),
          seed: z.number().int().min(0).max(2147483647),
          discount: z.number().min(0).max(100),
          costIncrease: z.number().min(0).max(1000),
        })
        .parse(await req.json());
      const d = await get<Dataset>(workspace, "dataset", body.datasetId),
        offer = await get<OfferSpec>(workspace, "offer", body.offerId);
      if (!d || !offer?.humanReviewed)
        throw Error("Selecione uma base e uma oferta revisada.");
      const total = d.profiles.filter(
        (p) =>
          !body.segments.length || body.segments.includes(p.segmentId ?? ""),
      ).length;
      if (!total)
        throw Error(
          "Não há clientes identificáveis nesta seleção. Analise as transações agregadas na população.",
        );
      const id = randomUUID();
      const sim: Simulation = {
        id,
        offer,
        datasetId: d.id,
        datasetSynthetic: d.synthetic,
        datasetVersion: d.version,
        engineVersion,
        seed: body.seed,
        segments: body.segments,
        status: "ready",
        processed: 0,
        total,
        createdAt: new Date().toISOString(),
        financialParameters: { discount: body.discount, costIncrease: body.costIncrease },
        scenarios: [
          {
            id: "current",
            name: "Atual",
            price: offer.price,
            unitCost: offer.unitCost,
          },
          {
            id: "discount",
            name: "Desconto comercial",
            price:
              Math.round(offer.price * (1 - body.discount / 100) * 100) / 100,
            unitCost: offer.unitCost,
          },
          {
            id: "cost_increase",
            name: "Aumento de custos",
            price: offer.price,
            unitCost:
              offer.unitCost === undefined
                ? undefined
                : offer.unitCost * (1 + body.costIncrease / 100),
          },
        ],
        aggregates: Object.fromEntries(
          ["current", "discount", "cost_increase"].map((s) => [
            s,
            { buy: 0, reject: 0, undecided: 0 },
          ]),
        ),
      };
      await put(workspace, "simulation", id, sim);
      after(() => runSimulation(workspace, id));
      return json(sim);
    }
    if (path[0] === "simulation" && path[1]) {
      const id = path[1];
      const sim = await get<Simulation>(workspace, "simulation", id);
      if (!sim)
        return NextResponse.json(
          { error: "Simulação não encontrada." },
          { status: 404 },
        );
      if (req.method === "POST" && path[2] === "resume") {
        if (sim.status !== "completed") assertEngineVersion(sim.engineVersion);
        after(() => runSimulation(workspace, id));
        return json({ ok: true });
      }
      if (path[2] === "replay") {
        const scenario = req.nextUrl.searchParams.get("scenario") ?? "current";
        if (!sim.scenarios.some((s) => s.id === scenario))
          throw Error("Cenário inválido.");
        const start =
          Math.floor(
            Math.max(
              0,
              Number(req.nextUrl.searchParams.get("start") ?? 0) || 0,
            ) / 250,
          ) * 250;
        const batch = await readBatch(workspace, id, scenario, start);
        const dataset = await get<Dataset>(workspace, "dataset", sim.datasetId);
        return json({
          ...batch,
          profiles:
            dataset?.profiles.filter((p) =>
              batch.decisions.some((d) => d.customerId === p.id),
            ) ?? [],
        });
      }
      if (path[2] === "export") {
        const decisions: CustomerDecision[] = [];
        for (const scenario of sim.scenarios)
          for (let start = 0; start < sim.processed; start += 250)
            decisions.push(
              ...(await readBatch(workspace, id, scenario.id, start)).decisions,
            );
        return new NextResponse(
          JSON.stringify(
            {
              simulation: sim,
              decisions,
              caveat: "Resultados sintéticos, sem previsão de conversão real.",
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="simula-${id}.json"`,
              "Cache-Control": "no-store",
            },
          },
        );
      }
      if (sim.status === "ready" || sim.status === "executing") {
        assertEngineVersion(sim.engineVersion);
        after(() => runSimulation(workspace, id));
      }
      return json(sim);
    }
    if (action === "privacy/delete" && req.method === "POST") {
      if (workspaceBusy(workspace) || offerChatBusy(workspace))
        throw Error(
          "Aguarde o processamento terminar antes de excluir o workspace.",
        );
      await remove(workspace);
      const res = json({ ok: true });
      res.cookies.delete("simula_session");
      return res;
    }
    return NextResponse.json(
      { error: "Rota não encontrada." },
      { status: 404 },
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(";")
        : (error as Error).message;
    return NextResponse.json(
      { error: message },
      { status: error instanceof StorageError ? 503 : 400 },
    );
  }
}
export const GET = handle;
export const POST = handle;
