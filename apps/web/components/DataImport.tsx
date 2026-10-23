"use client";
import { useState } from "react";
import { Upload, Check, ArrowRight, FlaskConical, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
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
  refresh: () => Promise<void>;
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
      <div className="import-steps" aria-label="Etapas da importação">
        <span className="import-step active"><i>1</i> Enviar arquivo</span>
        <ArrowRight size={15} />
        <span className={`import-step ${preview ? "active" : ""}`}><i>2</i> Revisar colunas</span>
        <ArrowRight size={15} />
        <span className="import-step"><i>3</i> Gerar perfis</span>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <Card className="import-upload-card">
        <label className="dropzone">
          <span className="upload-icon"><Upload size={25} /></span>
          <h2>
            {busy ? "Analisando seu arquivo…" : "Adicione seu histórico de compras"}
          </h2>
          <p>CSV, XLSX ou XML <span>·</span> até 10 MB <span>·</span> 50.000 linhas</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xml"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) load(e.target.files[0]);
            }}
          />
          <span className="privacy-hint"><ShieldCheck size={15} /> Use apenas os dados necessários. Nomes e documentos pessoais não são necessários.</span>
        </label>
      </Card>
      {preview && (
        <>
          <Card>
            <div className="section-title">
              <div className="import-section-heading"><span className="section-icon"><FileSpreadsheet size={17} /></span><div><h2>Revise os dados encontrados</h2><small>Confirme como cada coluna deve ser interpretada.</small></div></div>
              <Badge tone="blue">{count(preview.total)} linhas</Badge>
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
              <h2>Prévia do arquivo <small className="filename-chip">{preview.name}</small></h2>
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
                  await refresh();
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
      <div className="import-support-grid">
      <Card className="import-samples">
        <div className="import-section-heading"><span className="section-icon"><FileSpreadsheet size={17} /></span><div><h2>Experimente um arquivo</h2><small>Dados fictícios para conhecer o fluxo.</small></div></div>
        <div className="example-links">
          {["csv", "xlsx", "xml"].map((ext) => (
            <a
              className="button"
              key={ext}
              href={`/examples/historico.${ext}`}
              download
            >
              <DownloadIcon ext={ext} /> {ext.toUpperCase()}
            </a>
          ))}
        </div>
      </Card>
      <Card className="demo-card">
        <span className="demo-icon"><FlaskConical size={22} /></span>
        <div>
          <div className="demo-kicker"><Sparkles size={13} /> MODO DEMONSTRAÇÃO</div>
          <h2>Veja a população pronta</h2>
          <p>5.000 perfis de exemplo, identificados como fictícios.</p>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("demo", {});
              await refresh();
              navigate("/customers");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Carregar demo <ArrowRight size={16} />
        </button>
      </Card>
      </div>
    </>
  );
}

function DownloadIcon({ ext }: { ext: string }) {
  return <span className={`file-type-icon ${ext}`}>{ext === "xlsx" ? "X" : ext === "xml" ? "<" : "≡"}</span>;
}
