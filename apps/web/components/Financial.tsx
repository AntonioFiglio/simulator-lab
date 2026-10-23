"use client";
import { useState } from "react";
import { Calculator, ArrowRight, Save } from "lucide-react";
import { calculateFinancial } from "@packages/financial-engine";
import {
  scenarioLabels,
  type FinancialAnalysis,
  type FinancialInput,
} from "@packages/contracts";
import { Card, Field, Badge, Notice, money, api } from "./ui";
export default function Financial({
  saved,
  onSave,
}: {
  saved: FinancialAnalysis[];
  onSave: () => void;
}) {
  const [input, setInput] = useState<FinancialInput>({
    product: "",
    month: "2026-10",
    price: 0,
    quantity: 0,
    cost: 0,
    discount: 10,
    costIncrease: 15,
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  let scenarios: ReturnType<typeof calculateFinancial> = [];
  try {
    scenarios = calculateFinancial({
      ...input,
      product: input.product || "Produto",
    });
  } catch {}
  const update = (key: keyof FinancialInput, v: string) =>
    setInput((i) => ({
      ...i,
      [key]: key === "product" || key === "month" ? v : Number(v),
    }));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FINANCEIRO / HACKATHON 15</div>
          <h1>Uma decisão. Três perspectivas.</h1>
          <p>Entenda o impacto mensal de alterar preço ou custos.</p>
        </div>
        <Badge>1 produto · 1 mês</Badge>
      </div>
      <Notice>
        <strong>FÓRMULAS OFICIAIS PENDENTES</strong>
        <br />
        Cálculo demonstrativo: receita = preço × quantidade; resultado = receita
        − custos totais mensais. Regras provisórias, substituíveis pelas
        fórmulas da organização.
      </Notice>
      <Card>
        <div className="section-title">
          <h2>
            <Calculator size={19} /> Sua referência mensal
          </h2>
          <select
            aria-label="Análises salvas"
            defaultValue=""
            onChange={(e) => {
              const s = saved.find((s) => s.id === e.target.value);
              if (s) setInput(s.input);
            }}
          >
            <option value="">Carregar análise salva</option>
            {saved.map((s) => (
              <option key={s.id} value={s.id}>
                {s.input.product} · {s.input.month}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid financial-inputs">
          <Field label="Produto / serviço">
            <input
              value={input.product}
              placeholder="Nome do único produto"
              onChange={(e) => update("product", e.target.value)}
              maxLength={150}
            />
          </Field>
          <Field label="Período mensal">
            <input
              type="month"
              value={input.month}
              onChange={(e) => update("month", e.target.value)}
            />
          </Field>
          {[
            ["price", "Preço unitário (R$)"],
            ["quantity", "Quantidade vendida"],
            ["cost", "Custos totais do mês (R$)"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min="0"
                step={key === "quantity" ? "1" : ".01"}
                value={input[key as "price"]}
                onChange={(e) =>
                  update(key as keyof FinancialInput, e.target.value)
                }
              />
            </Field>
          ))}
        </div>
        <p className="hint">
          A quantidade permanece igual nos três cenários. Custos são o total
          mensal informado, não custo por unidade. Nenhuma aceitação sintética
          entra neste cálculo.
        </p>
      </Card>
      <div className="scenario-grid">
        {scenarios.map((s, index) => (
          <Card
            key={s.id}
            className={index === 0 ? "scenario baseline" : "scenario"}
          >
            <div className="section-title">
              <Badge tone={index === 0 ? "green" : "neutral"}>
                0{index + 1} · {scenarioLabels[s.name]}
              </Badge>
            </div>
            {index > 0 ? (
              <Field
                label={
                  index === 1
                    ? "Desconto sobre o preço (%)"
                    : "Aumento sobre os custos (%)"
                }
              >
                <div className="range-row">
                  <input
                    type="range"
                    min="0"
                    max={index === 1 ? 100 : 100}
                    value={index === 1 ? input.discount : input.costIncrease}
                    onChange={(e) =>
                      update(
                        index === 1 ? "discount" : "costIncrease",
                        e.target.value,
                      )
                    }
                  />
                  <input
                    aria-label={
                      index === 1 ? "Desconto percentual" : "Aumento percentual"
                    }
                    type="number"
                    min="0"
                    max={index === 1 ? 100 : 1000}
                    value={index === 1 ? input.discount : input.costIncrease}
                    onChange={(e) =>
                      update(
                        index === 1 ? "discount" : "costIncrease",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </Field>
            ) : (
              <p className="baseline-note">
                Seu ponto de partida para comparar mudanças.
              </p>
            )}
            <span className="muted">Resultado mensal demonstrativo</span>
            <strong
              className={`metric ${s.outputs.result < 0 ? "negative" : ""}`}
            >
              {money(s.outputs.result)}
            </strong>
            <p className="delta">
              {index === 0
                ? "Referência"
                : `${money(s.deltas.result.absolute)} · ${s.deltas.result.relative === null ? "% não definido (base zero)" : s.deltas.result.relative + "%"} vs. atual`}
            </p>
            <dl>
              <div>
                <dt>Preço unitário</dt>
                <dd>{money(s.price)}</dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{s.quantitySold}</dd>
              </div>
              {s.calculations.map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>{money(c.result)}</dd>
                </div>
              ))}
            </dl>
            <details open>
              <summary>Cálculos explícitos</summary>
              {index === 1 && (
                <p>
                  Preço = {input.price} × (1 − {input.discount}/100) = {s.price}
                </p>
              )}
              {index === 2 && (
                <p>
                  Custos = {input.cost} × (1 + {input.costIncrease}/100) ={" "}
                  {s.cost}
                </p>
              )}
              {s.calculations.map((c) => (
                <p key={c.label}>
                  <b>{c.label}</b>
                  <br />
                  {c.formula}
                  <br />
                  {c.substitution} = {money(c.result)}
                </p>
              ))}
            </details>
          </Card>
        ))}
      </div>
      {!scenarios.length && (
        <Notice>
          Revise os valores: use números não negativos, quantidade inteira e
          percentuais dentro dos limites.
        </Notice>
      )}
      <Card>
        <h2>Diferenças em relação ao atual</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Atual</th>
                <th>Desconto comercial</th>
                <th>Aumento de custos</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["revenue", "Receita"],
                ["cost", "Custos"],
                ["result", "Resultado"],
              ].map(([key, label]) => (
                <tr key={key}>
                  <td>{label}</td>
                  {scenarios.map((s) => (
                    <td key={s.id}>
                      {money(s.deltas[key].absolute)}{" "}
                      <small>
                        (
                        {s.deltas[key].relative === null
                          ? "não definido"
                          : s.deltas[key].relative + "%"}
                        )
                      </small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Δ absoluto = cenário − atual. Δ relativo = Δ absoluto ÷ |atual| × 100;
          indefinido quando atual = 0. Valores monetários arredondados a
          centavos.
        </p>
        <button
          className="primary"
          disabled={busy || !input.product || !scenarios.length}
          onClick={async () => {
            setBusy(true);
            try {
              await api("financial", input);
              setMessage("Análise salva com entradas, fórmulas e resultados.");
              onSave();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={16} />
          {busy ? "Salvando…" : "Salvar análise"}
        </button>
        <span role="status" className="inline-message">
          {message}
        </span>
      </Card>
    </>
  );
}
