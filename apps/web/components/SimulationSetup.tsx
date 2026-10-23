"use client";
import { useState } from "react";
import type { OfferSpec, Simulation } from "@packages/contracts";
import { api, Card, Field, Badge, Empty, Notice, count, money } from "./ui";
export default function Setup({
  datasets,
  simulations,
  offers,
  refresh,
  navigate,
}: {
  datasets: any[];
  simulations: Simulation[];
  offers: OfferSpec[];
  refresh: () => Promise<void>;
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
          <h1>Suas simulações, do cenário à evidência.</h1>
          <p>Retome uma análise ou configure uma nova hipótese para a sua população.</p>
        </div>
        <Badge>{count(simulations.length)} simulações</Badge>
      </div>
      {simulations.length > 0 && <Card>
        <div className="section-title"><h2>Explorar simulações</h2><span className="muted">Resultados sintéticos salvos</span></div>
        <div className="simulation-history">
          {[...simulations].reverse().map((simulation) => {
            const a = simulation.aggregates.current;
            const evaluated = a.buy + a.reject + a.undecided;
            return <article key={simulation.id}>
              <div><h3>{simulation.offer.title}</h3><span className="muted">{count(evaluated)} / {count(simulation.total)} perfis avaliados</span></div>
              <Badge tone={simulation.status === "completed" ? "green" : "amber"}>{simulation.status === "completed" ? "Concluída" : simulation.status === "partial_failure" ? "Falha parcial" : "Em processamento"}</Badge>
              <div className="history-decisions"><span>{count(a.buy)} aceitam</span><span>{count(a.reject)} rejeitam</span><span>{count(a.undecided)} indecisos</span></div>
              <div className="actions"><button className="primary" onClick={() => navigate(`/simulations/${simulation.id}/lab`)}>Explorar laboratório →</button><button onClick={() => navigate(`/simulations/${simulation.id}/results`)}>Ver evidências</button></div>
            </article>;
          })}
        </div>
      </Card>}
      <div className="section-title"><div><div className="eyebrow">NOVA SIMULAÇÃO</div><h2>Configure a próxima hipótese</h2></div><span className="muted">1. População e oferta → 2. Premissas → 3. Exploração</span></div>
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
                  await refresh();
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
