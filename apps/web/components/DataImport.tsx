"use client";
import { useState } from "react";
import { Upload, Check, ArrowRight, FlaskConical } from "lucide-react";
import { api, Card, Field, Notice, Badge, count } from "./ui";
const fields: Record<string, string> = {
  customer_id: "Identificador do cliente (opcional)",
  order_id: "Identificador do pedido",
  purchased_at: "Data da compra",
  product: "Produto (nome ou ID)",
  quantity: "Quantidade",
  unit_price: "Preço unitário",
  category: "Categoria (opcional)",
};
export default function DataImport({
  refresh,
  navigate,
}: {
  refresh: () => void;
  navigate: (s: string) => void;
}) {
  const [preview, setPreview] = useState<any>();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [locale, setLocale] = useState("pt-BR");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const p = await api("import/preview", form);
      setPreview(p);
      setMapping(
        Object.fromEntries(
          Object.keys(fields).map((k) => [
            k,
            p.columns.find(
              (c: string) =>
                c === k ||
                (k === "product" && ["product_name", "product_id"].includes(c)),
            ) ?? "",
          ]),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSUMER LAB / DADOS</div>
          <h1>O histórico é o ponto de partida.</h1>
          <p>Importe compras, confira as colunas e conheça sua população.</p>
        </div>
        <Badge tone="blue">Dados observados</Badge>
      </div>
      <div className="steps">
        <span className="active">01 Enviar arquivo</span>
        <ArrowRight size={16} />
        <span className={preview ? "active" : ""}>02 Revisar mapeamento</span>
        <ArrowRight size={16} />
        <span>03 Gerar perfis</span>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <Card>
        <label className="dropzone">
          <Upload size={32} />
          <h2>
            {busy ? "Processando arquivo…" : "Traga seu histórico de compras"}
          </h2>
          <p>CSV, XLSX ou XML · até 10 MB e 50.000 linhas</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xml"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) load(e.target.files[0]);
            }}
          />
          <span className="hint">
            Selecione um arquivo. Nomes, e-mails e documentos pessoais não são
            necessários.
          </span>
        </label>
      </Card>
      {preview && (
        <>
          <Card>
            <div className="section-title">
              <h2>Confirme o significado de cada coluna</h2>
              <Badge>{count(preview.total)} linhas</Badge>
            </div>
            <Field label="Formato dos valores e das datas">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                <option value="pt-BR">Brasil — 1.234,56 · DD/MM/AAAA</option>
                <option value="en-US">
                  Internacional — 1,234.56 · MM/DD/AAAA
                </option>
              </select>
            </Field>
            <div className="form-grid mapping">
              {Object.entries(fields).map(([key, label]) => (
                <Field label={label} key={key}>
                  <select
                    value={mapping[key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [key]: e.target.value }))
                    }
                  >
                    <option value="">Não disponível</option>
                    {preview.columns.map((c: string) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <Notice>
              Sem identificador persistente, as transações serão agrupadas por
              categoria. Nenhuma identidade individual será inventada. IDs são
              pseudonimizados após a confirmação.
            </Notice>
          </Card>
          <Card>
            <h2>Prévia do arquivo · {preview.name}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {preview.columns.map((c: string) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((r: any, i: number) => (
                    <tr key={i}>
                      {preview.columns.map((c: string) => (
                        <td key={c}>{r[c]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api("import/confirm", {
                    id: preview.id,
                    mapping,
                    locale,
                  });
                  refresh();
                  navigate("/customers");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={16} />
              Confirmar e gerar população
            </button>
          </Card>
        </>
      )}
      <Card>
        <h2>Arquivos de exemplo</h2>
        <p>
          Compras fictícias para conferir o fluxo de importação. Selecione o
          formato internacional no mapeamento.
        </p>
        <div className="example-links">
          {["csv", "xlsx", "xml"].map((ext) => (
            <a
              className="button"
              key={ext}
              href={`/examples/historico.${ext}`}
              download
            >
              Baixar {ext.toUpperCase()}
            </a>
          ))}
        </div>
      </Card>
      <Card className="demo-card">
        <FlaskConical size={28} />
        <div>
          <h2>Explore com uma empresa fictícia</h2>
          <p>
            5.000 perfis, cinco segmentos e compras demonstrativas. Sempre
            identificados como fictícios.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("demo", {});
              refresh();
              navigate("/customers");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Carregar demonstração <ArrowRight size={16} />
        </button>
      </Card>
    </>
  );
}
