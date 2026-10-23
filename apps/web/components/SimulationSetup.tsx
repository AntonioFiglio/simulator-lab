"use client";
import { useState } from "react";
import type { OfferSpec } from "@packages/contracts";
import { api, Card, Field, Badge, Empty, Notice, count, money } from "./ui";
export default function Setup({
  datasets,
  offers,
  refresh,
  navigate,
}: {
  datasets: any[];
  offers: OfferSpec[];
  refresh: () => void;
  navigate: (p: string) => void;
}) {
  const [datasetId, setDataset] = useState(datasets.at(-1)?.id ?? "");
  const [offerId, setOffer] = useState(offers.at(-1)?.id ?? "");
  const [segments, setSegments] = useState<string[]>([]);
  const [discount, setDiscount] = useState(10);
  const [costIncrease, setCostIncrease] = useState(15);
  const [seed, setSeed] = useState(42);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const d = datasets.find((d) => d.id === datasetId);
  const offer = offers.find((o) => o.id === offerId);
  if (!datasets.length || !offers.length)
    return (
      <Empty title="Prepare sua próxima simulação">
        Você precisa de uma base importada e uma oferta revisada.
        <button
          className="primary"
          onClick={() =>
            navigate(!datasets.length ? "/data/import" : "/offers/new")
          }
        >
          {!datasets.length ? "Importar dados" : "Criar oferta"}
        </button>
      </Empty>
    );
  const total = d
    ? Object.entries(d.segments as Record<string, number>)
        .filter(([s]) => !segments.length || segments.includes(s))
        .reduce((n, [, v]) => n + v, 0)
    : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSUMER LAB / CONFIGURAÇÃO</div>
          <h1>Transforme a hipótese em uma simulação.</h1>
          <p>Três cenários, a mesma população e razões rastreáveis.</p>
        </div>
        <Badge>Motor explicável v1</Badge>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="two-columns">
        <Card>
          <h2>População e oferta</h2>
          <div className="form-stack">
            <Field label="Base">
              <select
                value={datasetId}
                onChange={(e) => {
                  setDataset(e.target.value);
                  setSegments([]);
                }}
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Oferta revisada">
              <select
                value={offerId}
                onChange={(e) => setOffer(e.target.value)}
              >
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} · {money(o.price)}
                  </option>
                ))}
              </select>
            </Field>
            <h3>Segmentos</h3>
            <p className="hint">
              Nenhum filtro selecionado inclui todos os perfis identificáveis.
            </p>
            {Object.entries(d?.segments ?? {}).map(([s, n]) => (
              <label className="checkbox" key={s}>
                <input
                  type="checkbox"
                  checked={segments.includes(s)}
                  onChange={(e) =>
                    setSegments((v) =>
                      e.target.checked ? [...v, s] : v.filter((x) => x !== s),
                    )
                  }
                />
                {s}
                <span className="muted">{String(n)} perfis</span>
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Premissas dos cenários</h2>
          <div className="form-stack">
            <Field label="Desconto no preço (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </Field>
            <Field label="Aumento no custo unitário (%)">
              <input
                type="number"
                min="0"
                max="1000"
                value={costIncrease}
                onChange={(e) => setCostIncrease(Number(e.target.value))}
              />
            </Field>
            <Field label="Seed do replay visual">
              <input
                type="number"
                min="0"
                max="2147483647"
                step="1"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
              />
            </Field>
            <Notice>
              As decisões são determinísticas e não usam sorteio. A seed
              organiza a amostra visual. O aumento de custo não altera a
              aceitação quando preço e oferta permanecem iguais.
            </Notice>
            <p>
              <strong>{count(total)}</strong> avaliações por cenário ·{" "}
              <strong>{count(total * 3)}</strong> decisões no total
            </p>
            <p className="hint">
              Lotes de 250 perfis. Sem chamadas de IA por consumidor. Custo
              unitário{" "}
              {offer?.unitCost === undefined
                ? "desconhecido"
                : money(offer.unitCost)}
              .
            </p>
            <button
              className="primary"
              disabled={busy || !total}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const sim = await api("simulation", {
                    datasetId,
                    offerId,
                    segments,
                    discount,
                    costIncrease,
                    seed,
                  });
                  refresh();
                  navigate(`/simulations/${sim.id}/lab`);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Preparando…" : "Executar simulação →"}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
