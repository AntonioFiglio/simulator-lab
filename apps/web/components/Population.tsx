"use client";
import { useState, useEffect } from "react";
import {
  api,
  Card,
  Field,
  Badge,
  Empty,
  Metric,
  count,
  money,
  Notice,
} from "./ui";
import type { CustomerProfile, Purchase } from "@packages/contracts";
export function ProfileDetail({
  datasetId,
  id,
}: {
  datasetId: string;
  id: string;
}) {
  const [data, setData] = useState<{
    profile: CustomerProfile;
    history: Purchase[];
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(undefined);
    api(`customer?dataset=${datasetId}&id=${id}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [datasetId, id]);
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <p>Carregando histórico…</p>;
  return (
    <>
      <Badge tone="blue">Histórico observado</Badge>
      <h3>{data.profile.segmentId}</h3>
      <dl>
        <div>
          <dt>Pedidos</dt>
          <dd>{data.profile.features.ordersCount}</dd>
        </div>
        <div>
          <dt>Ticket médio</dt>
          <dd>{money(data.profile.features.averageOrderValue)}</dd>
        </div>
        <div>
          <dt>Total observado</dt>
          <dd>{money(data.profile.features.totalSpent)}</dd>
        </div>
        <div>
          <dt>Recência</dt>
          <dd>{data.profile.features.daysSinceLastPurchase} dias</dd>
        </div>
      </dl>
      <p className="hint">
        Recência em relação à última compra da base, não à data de hoje.
      </p>
      <div className="history-list">
        {data.history.map((h) => (
          <article key={h.id}>
            <strong>{h.product}</strong>
            <small>
              {h.purchasedAt} · {h.quantity} un. × {money(h.unitPrice)}
            </small>
            <small>Categoria: {h.category ?? "desconhecida"}</small>
            <code>{h.id.slice(0, 8)}</code>
          </article>
        ))}
      </div>
    </>
  );
}
export default function Population({
  datasets,
  definitions,
  navigate,
}: {
  datasets: any[];
  definitions: Record<string, string>;
  navigate: (p: string) => void;
}) {
  const [selected, setSelected] = useState(datasets.at(-1)?.id ?? "");
  const [segment, setSegment] = useState("");
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [data, setData] = useState<{
    profiles: CustomerProfile[];
    total: number;
  }>({ profiles: [], total: 0 });
  const [person, setPerson] = useState("");
  const [error, setError] = useState("");
  const dataset = datasets.find((d) => d.id === selected) ?? datasets.at(-1);
  useEffect(() => {
    if (!dataset) return;
    let active = true;
    api(
      `customers?dataset=${dataset.id}&segment=${encodeURIComponent(segment)}&offset=${offset}&q=${encodeURIComponent(q)}`,
    )
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [dataset?.id, segment, offset, q]);
  if (!dataset)
    return (
      <Empty title="Sua população começa nos dados">
        <button className="primary" onClick={() => navigate("/data/import")}>
          Importar histórico
        </button>
      </Empty>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSUMER LAB / POPULAÇÃO</div>
          <h1>Conheça os padrões da sua base.</h1>
          <p>Segmentos explicáveis, derivados de compras registradas.</p>
        </div>
        <button className="primary" onClick={() => navigate("/offers/new")}>
          Criar oferta →
        </button>
      </div>
      <Field label="Base de dados">
        <select
          value={dataset.id}
          onChange={(e) => {
            setSelected(e.target.value);
            setOffset(0);
            setSegment("");
            setPerson("");
          }}
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      {dataset.synthetic && (
        <Notice>
          BASE FICTÍCIA DE DEMONSTRAÇÃO — estes registros não representam
          clientes reais.
        </Notice>
      )}
      <div className="metrics">
        <Metric
          label="Perfis identificáveis"
          value={count(dataset.profileCount)}
          detail={`${Object.keys(dataset.segments).length} segmentos observados`}
        />
        <Metric
          label="Compras válidas"
          value={count(dataset.quality.accepted)}
          detail={`${dataset.quality.duplicates} duplicatas removidas`}
        />
        <Metric
          label="Cobertura de identificação"
          value={`${(((dataset.quality.accepted - dataset.quality.unidentified) / dataset.quality.accepted) * 100).toFixed(1)}%`}
          detail={`${dataset.quality.unidentified} compras sem cliente`}
        />
        <Metric
          label="Linhas rejeitadas"
          value={count(dataset.quality.rejected)}
          detail={`Referência: ${dataset.referenceDate}`}
        />
      </div>
      <div className="segment-grid">
        {Object.entries(dataset.segments as Record<string, number>).map(
          ([s, n]) => (
            <button
              key={s}
              className={`segment-card ${segment === s ? "selected" : ""}`}
              onClick={() => {
                setSegment(segment === s ? "" : s);
                setOffset(0);
              }}
            >
              <strong>{s}</strong>
              <span className="metric">{count(n)}</span>
              <small>{definitions[s]}</small>
            </button>
          ),
        )}
      </div>
      {dataset.quality.unidentified > 0 && (
        <Card>
          <h2>Transações sem identidade persistente</h2>
          <p>
            Visão agregada por categoria; não participam de decisões
            individuais.
          </p>
          {Object.entries(dataset.anonymousCategories).map(([c, n]) => (
            <p key={c}>
              {c}: {String(n)} transações
            </p>
          ))}
        </Card>
      )}
      {dataset.quality.issues.length > 0 && (
        <details className="card">
          <summary>Problemas de qualidade (até 20 exemplos)</summary>
          {dataset.quality.issues.map((s: string) => (
            <p key={s}>{s}</p>
          ))}
        </details>
      )}
      {error && <Notice>{error}</Notice>}
      <div className={person ? "inspector-layout" : ""}>
        <Card>
          <div className="section-title">
            <h2>Perfis pseudonimizados</h2>
            <input
              placeholder="Buscar ID"
              aria-label="Buscar perfil"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Consumidor</th>
                  <th>Segmento</th>
                  <th>Pedidos</th>
                  <th>Ticket médio</th>
                  <th>Recência</th>
                </tr>
              </thead>
              <tbody>
                {data.profiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setPerson(p.id)}
                      >
                        {p.id.slice(0, 12)}
                      </button>
                    </td>
                    <td>{p.segmentId}</td>
                    <td>{p.features.ordersCount}</td>
                    <td>{money(p.features.averageOrderValue)}</td>
                    <td>{p.features.daysSinceLastPurchase} dias</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={!offset} onClick={() => setOffset((o) => o - 50)}>
              Anterior
            </button>
            <span>
              {data.total ? offset + 1 : 0}–{Math.min(offset + 50, data.total)}{" "}
              de {count(data.total)}
            </span>
            <button
              disabled={offset + 50 >= data.total}
              onClick={() => setOffset((o) => o + 50)}
            >
              Próxima
            </button>
          </div>
        </Card>
        {person && (
          <Card>
            <div className="section-title">
              <h2>{person.slice(0, 12)}</h2>
              <button aria-label="Fechar perfil" onClick={() => setPerson("")}>
                ×
              </button>
            </div>
            <ProfileDetail datasetId={dataset.id} id={person} />
          </Card>
        )}
      </div>
    </>
  );
}
