"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Play, Pause, RotateCcw, Focus, Download } from "lucide-react";
import type {
  Simulation,
  CustomerDecision,
  SimulationEvent,
  CustomerProfile,
} from "@packages/contracts";
import { caveat } from "@packages/contracts";
import { useReplay } from "./lab-3d/store";
import { ProfileDetail } from "./Population";
import { api, Card, Field, Badge, Notice, Metric, count, money } from "./ui";
const World = dynamic(() => import("./lab-3d/World"), {
  ssr: false,
  loading: () => <div className="world-loading">Preparando o laboratório…</div>,
});
const decisionNames = {
  buy: "Aceitou na simulação",
  reject: "Rejeitou na simulação",
  undecided: "Indeciso",
};
export default function SimulationView({
  id,
  view,
  navigate,
}: {
  id: string;
  view: string;
  navigate: (p: string) => void;
}) {
  const [sim, setSim] = useState<Simulation>();
  const [scenario, setScenario] = useState("current");
  const [start, setStart] = useState(0);
  const [page, setPage] = useState(0);
  const [segment, setSegment] = useState("");
  const [mode, setMode] = useState("3d");
  const [focus, setFocus] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState<{
    decisions: CustomerDecision[];
    events: SimulationEvent[];
    profiles: CustomerProfile[];
  }>({ decisions: [], events: [], profiles: [] });
  const { playing, setPlaying, speed, setSpeed, selected, select, restart, elapsed, seek } =
    useReplay();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const s = await api<Simulation>(`simulation/${id}`);
        if (active) setSim(s);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    load();
    const timer = setInterval(load, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);
  useEffect(() => {
    let active = true;
    if (sim?.processed) {
      setLoadingBatch(true);
      api(`simulation/${id}/replay?scenario=${scenario}&start=${start}`)
        .then((b) => {
          if (active) { setBatch(b); setLoadingBatch(false); }
        })
        .catch((e) => { if (active) { setError(e.message); setLoadingBatch(false); } });
    }
    return () => {
      active = false;
    };
  }, [id, scenario, start, sim?.processed]);
  const filtered = batch.decisions.filter(
    (d) =>
      !segment ||
      batch.profiles.find((p) => p.id === d.customerId)?.segmentId === segment,
  );
  useEffect(() => { restart(); setFocus(false); }, [id, scenario, start, page, segment, restart]);
  const next = useCallback(() => {
    if (page + 36 < filtered.length) setPage((v) => v + 36);
    else {
      setPage(0);
      setStart((s) => (s + 250 < (sim?.processed ?? 0) ? s + 250 : 0));
    }
  }, [page, filtered.length, sim?.processed]);
  if (!sim) return <Card>{error || "Carregando simulação…"}</Card>;
  const totals = sim.aggregates[scenario],
    total = totals.buy + totals.reject + totals.undecided;
  const visible = filtered.slice(page, page + 36);
  const chosen = batch.decisions.find((d) => d.customerId === selected);
  const segments = [...new Set(batch.profiles.map((p) => p.segmentId ?? ""))];
  const sampleTotals = visible.reduce((a, d) => { a[d.decision]++; return a; }, { buy: 0, reject: 0, undecided: 0 });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            CONSUMER LAB / {view === "lab" ? "LABORATÓRIO" : "RESULTADOS"}
          </div>
          <h1>{sim.offer.title}</h1>
          <p>Veja a distribuição das decisões e investigue o que sustenta cada resultado.</p>
        </div>
        <Badge tone={sim.status === "completed" ? "green" : "blue"}>
          {sim.status === "completed"
            ? "Concluída"
            : sim.status === "partial_failure"
              ? "Falha parcial"
              : `Processando ${count(sim.processed)} / ${count(sim.total)}`}
        </Badge>
      </div>
      <div className="tabs">
        <button
          className={view === "lab" ? "active" : ""}
          onClick={() => navigate(`/simulations/${id}/lab`)}
        >
          Laboratório 3D
        </button>
        <button
          className={view === "results" ? "active" : ""}
          onClick={() => navigate(`/simulations/${id}/results`)}
        >
          Resultados sintéticos
        </button>
        <button onClick={() => navigate(`/simulations/${id}/financials`)}>
          Financeiro / Hackathon 15 ↗
        </button>
      </div>
      {sim.datasetSynthetic && (
        <Notice>
          BASE FICTÍCIA DE DEMONSTRAÇÃO — os históricos desta simulação não
          representam clientes reais.
        </Notice>
      )}
      <Notice>{caveat}</Notice>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {sim.status !== "completed" && (
        <Card>
          <progress value={sim.processed} max={sim.total} />
          <p>
            {count(sim.processed)} de {count(sim.total)} perfis avaliados por
            cenário. {sim.error}
          </p>
          <button
            onClick={async () => {
              try {
                await api(`simulation/${id}/resume`, {});
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Retomar processamento
          </button>
        </Card>
      )}
      <div className="section-title"><h2>População avaliada</h2><span className="muted">Totais do cenário · independentes do replay e do filtro da amostra</span></div>
      <div className="metrics">
        <Metric
          label="Avaliados neste cenário"
          value={count(total)}
          detail={`Cobertura: ${(sim.total ? (total / sim.total) * 100 : 0).toFixed(1)}%`}
        />
        <Metric
          label="Aceitações sintéticas"
          value={count(totals.buy)}
          detail={`${total ? ((totals.buy / total) * 100).toFixed(1) : 0}% de aceitação sintética`}
        />
        <Metric label="Rejeições sintéticas" value={count(totals.reject)} />
        <Metric label="Indecisos" value={count(totals.undecided)} />
      </div>
      <div className="toolbar">
        <Field label="Cenário">
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              setPage(0);
              select("");
            }}
          >
            {sim.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {money(s.price)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filtrar amostra por segmento">
          <select
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos os segmentos</option>
            {segments.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <a className="button" href={`/api/simulation/${id}/export`}>
          <Download size={16} />
          Exportar evidências
        </a>
      </div>
      {view === "lab" && (
        <div className="simulation-lab-layout">
          <Card className="world-card">
            <div className="world-toolbar">
              <div>
                <div className="eyebrow">MAPA DE DECISÕES</div>
                <h2>Uma decisão, um lugar no laboratório.</h2>
                <p>
                  {visible.length} perfis nesta amostra de{" "}
                  {count(sim.total)} perfis · lote {Math.floor(start / 250) + 1}
                </p>
              </div>
              <button
                onClick={() => setMode((m) => (m === "3d" ? "table" : "3d"))}
              >
                {mode === "3d" ? "Usar tabela" : "Ver 3D"}
              </button>
            </div>
            {loadingBatch ? <div className="world-loading" role="status">Carregando decisões do cenário…</div> : mode === "3d" && (
              <div className="world">
                <World
                  events={batch.events}
                  ids={visible.map((d) => d.customerId)}
                  seed={sim.seed}
                  focus={focus}
                />
              </div>
            )}
            <div className="sample-outcomes">
              {(["buy", "undecided", "reject"] as const).map((d) => (
                <div key={d} className={`sample-outcome ${d}`}>
                  <span>{decisionNames[d]}</span><strong>{sampleTotals[d]} <small>/ {visible.length}</small></strong>
                  <span>{visible.length ? (100 * sampleTotals[d] / visible.length).toFixed(1) : "0"}% da amostra</span>
                </div>
              ))}
            </div>
            <div className="replay-timeline">
              <div><strong>{elapsed >= 14 ? "Distribuição concluída · avatares preservados" : elapsed < 5 ? "1. Aproximação e observação" : elapsed < 10 ? "2. Exibição das decisões" : "3. Organização por resultado"}</strong><span>{elapsed.toFixed(1)} / 14 s</span></div>
              <input type="range" aria-label="Posição no replay" min="0" max="14" step="0.1" value={elapsed} onChange={(e) => seek(Number(e.target.value))} disabled={loadingBatch} />
              <p>Os personagens permanecem no mapa. A amostra só muda quando você avança. Contagens mostram o resultado final desta amostra.</p>
            </div>
            <div className="playback">
              <button
                aria-label={playing ? "Pausar" : "Reproduzir"}
                onClick={() => elapsed >= 14 ? restart() : setPlaying(!playing)}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <select
                aria-label="Velocidade do replay"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[0.5, 1, 2, 4].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  restart();
                }}
              >
                <RotateCcw size={15} />
                Rever amostra
              </button>
              <button onClick={() => seek(14)}>Ver distribuição final</button>
              <button disabled={!chosen} onClick={() => setFocus(!focus)}>
                <Focus size={15} />
                {focus ? "Liberar câmera" : "Focar avatar"}
              </button>
              <button disabled={loadingBatch} onClick={next}>Próxima amostra →</button>
            </div>
          </Card>
          {!chosen && <Card className="inspector inspector-empty">
            <div className="eyebrow">INSPECIONAR PERFIL</div>
            <h2>Entenda o motivo da decisão</h2>
            <p>Clique em um personagem ou em um consumidor na tabela para consultar suas evidências.</p>
            <ol><li>Observe a oferta no centro.</li><li>Acompanhe os perfis até as três áreas.</li><li>Selecione um perfil para comparar decisão e histórico.</li></ol>
            <Notice>Esta amostra não é uma estimativa da população. Use os totais acima para analisar todos os perfis avaliados.</Notice>
          </Card>}
          {chosen && (
            <Card className="inspector">
              <div className="section-title">
                <h2>{chosen.customerId.slice(0, 12)}</h2>
                <button
                  onClick={() => select("")}
                  aria-label="Fechar inspector"
                >
                  ×
                </button>
              </div>
              <Badge
                tone={
                  chosen.decision === "reject"
                    ? "red"
                    : chosen.decision === "undecided"
                      ? "amber"
                      : "green"
                }
              >
                {decisionNames[chosen.decision]}
              </Badge>
              <h3>Razões e evidências</h3>
              {chosen.reasons.map((r, i) => (
                <div className="reason" key={i}>
                  <Badge tone={r.basis === "observed" ? "blue" : "amber"}>
                    {r.basis === "observed" ? "Observado" : "Premissa"}
                  </Badge>
                  <p>{r.text}</p>
                  {r.sourceIds && (
                    <small>
                      Fontes: {r.sourceIds.map((s) => s.slice(0, 8)).join(", ")}
                    </small>
                  )}
                </div>
              ))}
              <div className="inventory">
                <h3>Inventário da simulação</h3>
                {chosen.decision === "buy" ? (
                  <p>▣ {sim.offer.title} · aceito neste cenário</p>
                ) : (
                  <p>Nenhum item aceito.</p>
                )}
                <small>
                  Separado do histórico real. Nenhuma compra foi realizada.
                </small>
              </div>
              <ProfileDetail datasetId={sim.datasetId} id={chosen.customerId} />
            </Card>
          )}
        </div>
      )}
      <Card>
        <div className="section-title">
          <h2>
            {view === "lab"
              ? "Amostra inspecionável · alternativa ao 3D"
              : "Decisões e evidências"}
          </h2>
          <span className="muted">
            {filtered.length} perfis neste lote filtrado
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Consumidor</th>
                <th>Segmento</th>
                <th>Decisão sintética</th>
                <th>Afinidade heurística</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.customerId} className={selected === d.customerId ? "selected-decision" : ""}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        select(d.customerId);
                        setPlaying(false);
                      }}
                    >
                      {d.customerId.slice(0, 12)}
                    </button>
                  </td>
                  <td>
                    {
                      batch.profiles.find((p) => p.id === d.customerId)
                        ?.segmentId
                    }
                  </td>
                  <td>
                    <Badge
                      tone={
                        d.decision === "buy"
                          ? "green"
                          : d.decision === "reject"
                            ? "red"
                            : "amber"
                      }
                    >
                      {decisionNames[d.decision]}
                    </Badge>
                  </td>
                  <td>{d.affinityScore === undefined ? "Desconhecida" : `${d.affinityScore.toFixed(2)} / 1`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <p>
            Nenhum perfil neste lote/filtro. Avance a amostra ou remova o
            filtro.
          </p>
        )}
        <button disabled={loadingBatch} onClick={next}>Próxima amostra →</button>
      </Card>
      <Card>
        {chosen && view !== "lab" && (
          <div className="two-columns">
            <section>
              <h2>
                {chosen.customerId.slice(0, 12)} ·{" "}
                {decisionNames[chosen.decision]}
              </h2>
              {chosen.reasons.map((r, i) => (
                <p key={i}>
                  <b>{r.basis === "observed" ? "Observado" : "Premissa"}: </b>
                  {r.text}
                </p>
              ))}
              <p>
                Inventário simulado:{" "}
                {chosen.decision === "buy"
                  ? sim.offer.title
                  : "nenhum item aceito"}
              </p>
            </section>
            <section>
              <ProfileDetail datasetId={sim.datasetId} id={chosen.customerId} />
            </section>
          </div>
        )}
        <h2>Comparação dos cenários sintéticos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Aceitam</th>
                <th>Rejeitam</th>
                <th>Indecisos</th>
                <th>Aceitação sintética</th>
              </tr>
            </thead>
            <tbody>
              {sim.scenarios.map((s) => {
                const a = sim.aggregates[s.id],
                  n = a.buy + a.reject + a.undecided;
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{count(a.buy)}</td>
                    <td>{count(a.reject)}</td>
                    <td>{count(a.undecided)}</td>
                    <td>
                      {n ? ((a.buy / n) * 100).toFixed(1) : 0}%
                      <div className="bar">
                        <span
                          style={{ width: `${n ? (a.buy / n) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          O cenário de custos mantém as mesmas decisões porque não altera o
          preço da oferta ao consumidor.
        </p>
      </Card>
      <Card>
        <h2>Resultados por segmento · população avaliada</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Segmento</th>
                <th>Aceitam</th>
                <th>Rejeitam</th>
                <th>Indecisos</th>
                <th>Aceitação sintética</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sim.segmentAggregates?.[scenario] ?? {}).map(
                ([segment, a]) => {
                  const n = a.buy + a.reject + a.undecided;
                  return (
                    <tr key={segment}>
                      <td>{segment}</td>
                      <td>{count(a.buy)}</td>
                      <td>{count(a.reject)}</td>
                      <td>{count(a.undecided)}</td>
                      <td>
                        {n ? ((100 * a.buy) / n).toFixed(1) : 0}%
                        <div className="bar">
                          <span
                            style={{ width: `${n ? (100 * a.buy) / n : 0}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2>Rastreabilidade e próximos passos</h2>
        <p>
          Motor: <code>{sim.engineVersion}</code> · seed visual: {sim.seed} ·
          base: <code>{sim.datasetVersion}</code>
        </p>
        <p>
          Hipóteses a validar: investigar em pesquisa a relevância da categoria;
          medir exposição e recusas em um experimento; comparar vendas
          observadas antes de calibrar qualquer previsão.
        </p>
        <p className="hint">
          Oferta e base versionadas nesta execução. Resultados financeiros são
          calculados separadamente com quantidade mensal informada.
        </p>
      </Card>
    </>
  );
}
