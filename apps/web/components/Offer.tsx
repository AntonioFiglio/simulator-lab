"use client";
import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import type { OfferSpec } from "@packages/contracts";
import { Card, Field, Badge, Notice, api, money } from "./ui";
export default function Offer({
  aiConfigured,
  refresh,
  navigate,
}: {
  aiConfigured: boolean;
  refresh: () => void;
  navigate: (p: string) => void;
}) {
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    kind: "subscription",
    category: "",
    price: 49,
    unitCost: "",
    benefits: "",
    targetAudience: "",
  });
  const [spec, setSpec] = useState<OfferSpec>();
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const edit = (key: string, value: string | number) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSpec(undefined);
    setReviewed(false);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSUMER LAB / NOVA OFERTA</div>
          <h1>Qual hipótese você quer explorar?</h1>
          <p>Descreva a proposta. Revise cada informação antes de simular.</p>
        </div>
        <Badge tone="blue">Revisão humana obrigatória</Badge>
      </div>
      {!aiConfigured && (
        <Notice>
          IA externa não configurada. A estruturação local preserva seus campos
          declarados e sinaliza lacunas, sem se apresentar como interpretação
          por IA. O provedor pode ser habilitado nas variáveis de ambiente.
        </Notice>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="two-columns">
        <Card>
          <h2>Descreva seu produto ou serviço</h2>
          <div className="form-stack">
            <Field label="Nome da oferta">
              <input
                value={draft.title}
                onChange={(e) => edit("title", e.target.value)}
                placeholder="Ex.: assinatura de bem-estar"
              />
            </Field>
            <Field label="Descrição livre">
              <textarea
                rows={5}
                value={draft.description}
                onChange={(e) => edit("description", e.target.value)}
                placeholder="O que você oferece? Como funciona? Quais são as condições?"
              />
            </Field>
            <div className="form-grid">
              <Field label="Tipo">
                <select
                  value={draft.kind}
                  onChange={(e) => edit("kind", e.target.value)}
                >
                  <option value="physical">Produto físico</option>
                  <option value="digital">Produto digital</option>
                  <option value="service">Serviço</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </Field>
              <Field label="Categoria">
                <input
                  value={draft.category}
                  onChange={(e) => edit("category", e.target.value)}
                  placeholder="Desconhecida se não informada"
                />
              </Field>
              <Field label="Preço (R$)">
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={draft.price}
                  onChange={(e) => edit("price", Number(e.target.value))}
                />
              </Field>
              <Field label="Custo unitário (opcional)">
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={draft.unitCost}
                  onChange={(e) => edit("unitCost", e.target.value)}
                  placeholder="Desconhecido"
                />
              </Field>
            </div>
            <Field label="Benefícios declarados (um por linha)">
              <textarea
                rows={3}
                value={draft.benefits}
                onChange={(e) => edit("benefits", e.target.value)}
              />
            </Field>
            <Field label="Público desejado (opcional)">
              <input
                value={draft.targetAudience}
                onChange={(e) => edit("targetAudience", e.target.value)}
              />
            </Field>
            <button
              className="primary"
              disabled={busy || !draft.title || draft.description.length < 10}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setSpec(
                    await api("offer/interpret", {
                      ...draft,
                      unitCost:
                        draft.unitCost === ""
                          ? undefined
                          : Number(draft.unitCost),
                      statedBenefits: draft.benefits
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sparkles size={16} />
              {busy
                ? "Estruturando…"
                : aiConfigured
                  ? "Interpretar oferta com IA"
                  : "Estruturar para revisão"}
            </button>
          </div>
        </Card>
        <Card className={!spec ? "review-empty" : ""}>
          {!spec ? (
            <>
              <Sparkles size={32} />
              <h2>Sua oferta, com clareza.</h2>
              <p>
                A interpretação aparecerá aqui. Informações ausentes serão
                marcadas como desconhecidas.
              </p>
            </>
          ) : (
            <>
              <Badge>Interpretação para revisão</Badge>
              <h2>{spec.title}</h2>
              <p>{spec.description}</p>
              <dl>
                <div>
                  <dt>Preço</dt>
                  <dd>{money(spec.price)}</dd>
                </div>
                <div>
                  <dt>Custo unitário</dt>
                  <dd>
                    {spec.unitCost === undefined
                      ? "Desconhecido"
                      : money(spec.unitCost)}
                  </dd>
                </div>
                <div>
                  <dt>Categoria</dt>
                  <dd>{spec.category || "Desconhecida"}</dd>
                </div>
              </dl>
              <h3>Benefícios declarados</h3>
              {spec.statedBenefits.length ? (
                spec.statedBenefits.map((b) => <p key={b}>✓ {b}</p>)
              ) : (
                <p>Não informados.</p>
              )}
              <h3>Hipóteses da interpretação</h3>
              {spec.inferredHypotheses.length ? (
                spec.inferredHypotheses.map((h) => <p key={h}>{h}</p>)
              ) : (
                <p>Nenhuma hipótese adicional.</p>
              )}
              {!!spec.unknowns?.length && (
                <Notice>{spec.unknowns.join(" · ")}</Notice>
              )}
              <p className="hint">
                {spec.provider}. Para corrigir, edite os campos e gere uma nova
                interpretação.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Revisei a proposta, as lacunas e as hipóteses.
              </label>
              <button
                className="primary"
                disabled={!reviewed || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("offer/review", { ...spec, humanReviewed: true });
                    refresh();
                    navigate("/simulations/new");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={16} />
                Confirmar oferta e continuar
              </button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
