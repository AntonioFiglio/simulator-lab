"use client";
import { useEffect, useState } from "react";
import type { TrialRun } from "@packages/agent-runtime";
export default function Agents() {
  const [runs, setRuns] = useState<TrialRun[]>([]),
    [enabled, setEnabled] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    try {
      const r = await fetch("/api/agents");
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRuns(d.runs);
      setEnabled(d.enabled);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, []);
  async function action(path: string) {
    setError("");
    try {
      const r = await fetch("/api/agents/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section>
      <h1>Agentes — piloto</h1>
      <p>
        Perfis hipotéticos em uma agenda fictícia. Resultados não estimam
        conversão real.
      </p>
      {error && <p role="alert">{error}</p>}
      <p>
        {enabled
          ? "Modo habilitado"
          : "Modo desativado; resultados preservados."}
      </p>
      {enabled && (
        <button onClick={() => void action("batch")}>
          Preparar seis execuções
        </button>
      )}
      <p>
        O executor dedicado processa as tarefas preparadas. As ações e
        resultados aparecem abaixo.
      </p>
      <table>
        <thead>
          <tr>
            <th>Perfil / variante</th>
            <th>Status</th>
            <th>Resultado</th>
            <th>Consumo</th>
            <th>Ações e evidências</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>
                {r.persona.id} / {r.variant}
              </td>
              <td>
                {r.status} {r.outcome}
              </td>
              <td>
                {r.evaluation
                  ? r.evaluation.success
                    ? "Objetivo verificado"
                    : "Objetivo não verificado"
                  : "Aguardando avaliação"}
                {r.error && <p>{r.error}</p>}
              </td>
              <td>
                {r.tokens} tokens; custo monetário depende da tarifa do modelo.
              </td>
              <td>
                {["ready", "running"].includes(r.status) && (
                  <button onClick={() => void action(r.id + "/cancel")}>
                    Cancelar
                  </button>
                )}
                <details>
                  <summary>{r.events.length} ações</summary>
                  <ol>
                    {r.events.map((e) => (
                      <li key={e.step}>
                        <pre>{JSON.stringify(e.action)}</pre>
                        <p>{e.result}</p>
                        <details>
                          <summary>Observação</summary>
                          <pre>{e.observation}</pre>
                        </details>
                        <p>Captura local: {e.screenshot ?? "indisponível"}</p>
                      </li>
                    ))}
                  </ol>
                  <pre>{JSON.stringify(r.evaluation?.checks, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
