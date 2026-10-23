"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Upload,
  Users,
  PackagePlus,
  FlaskConical,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Menu,
  X,
  Activity,
} from "lucide-react";
import Agents from "./Agents";
import Financial from "./Financial";
import DataImport from "./DataImport";
import Population from "./Population";
import Offer from "./Offer";
import Setup from "./SimulationSetup";
import SimulationView from "./SimulationView";
import { api, Card, Field, Badge, Metric, Notice, count } from "./ui";
import type {
  FinancialAnalysis,
  OfferSpec,
  Simulation,
} from "@packages/contracts";
type State = {
  workspace: { name: string };
  datasets: any[];
  offers: OfferSpec[];
  simulations: Simulation[];
  financials: FinancialAnalysis[];
  segmentDefinitions: Record<string, string>;
  aiConfigured: boolean;
};
const nav = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard },
  { path: "/financials", label: "Financeiro", icon: Calculator },
  { path: "/data/import", label: "Importar dados", icon: Upload },
  { path: "/customers", label: "População", icon: Users },
  { path: "/offers/new", label: "Nova oferta", icon: PackagePlus },
  { path: "/simulations/new", label: "Simulações", icon: FlaskConical },
  { path: "/agents", label: "Agentes piloto", icon: Activity },
];
export default function App() {
  const pathname = usePathname(),
    router = useRouter();
  const [state, setState] = useState<State>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("Meu laboratório");
  const [menu, setMenu] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setState(await api("state"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const navigate = (p: string) => {
    router.push(p);
    setMenu(false);
  };
  if (loading)
    return (
      <div className="welcome">
        <div className="brand-icon">s</div>
        <p>Abrindo seu laboratório…</p>
      </div>
    );
  if (!state)
    return (
      <div className="welcome">
        <div className="welcome-card">
          <div className="brand">
            <span className="brand-icon">s</span>simula
          </div>
          <div className="eyebrow">CONSUMER SIMULATION LAB</div>
          <h1>
            Decisões melhores
            <br />
            começam com boas perguntas.
          </h1>
          <p>
            Compare cenários financeiros. Investigue hipóteses de consumo em um
            laboratório vivo.
          </p>
          <Field label="Nome do workspace">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <button
            className="primary"
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api("session", { name });
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Abrindo…" : "Abrir meu laboratório →"}
          </button>
          {error && !error.includes("Abra um workspace") && (
            <p className="error">{error}</p>
          )}
          <p className="hint">
            Workspace privado deste navegador. Não limpe os cookies se quiser
            manter o acesso. Cada nova sessão cria um espaço isolado.
          </p>
        </div>
        <div className="welcome-art">
          <div className="iso-block b1" />
          <div className="iso-block b2" />
          <div className="iso-block b3" />
          <div className="art-caption">
            Explore. Compare. Entenda.
            <br />
            <small>Uma hipótese de cada vez.</small>
          </div>
        </div>
      </div>
    );
  const match = pathname.match(
    /^\/simulations\/([^/]+)\/(lab|results|financials)$/,
  );
  const currentNav = nav.find((n) => n.path === pathname);
  let content;
  if (pathname === "/financials" || match?.[2] === "financials")
    content = <Financial saved={state.financials} onSave={refresh} />;
  else if (pathname === "/agents") content = <Agents />;
  else if (pathname === "/data/import")
    content = <DataImport refresh={refresh} navigate={navigate} />;
  else if (pathname === "/customers")
    content = (
      <Population
        datasets={state.datasets}
        definitions={state.segmentDefinitions}
        navigate={navigate}
      />
    );
  else if (pathname === "/offers/new")
    content = (
      <Offer
        aiConfigured={state.aiConfigured}
        refresh={refresh}
        navigate={navigate}
      />
    );
  else if (pathname === "/simulations/new")
    content = (
      <Setup
        simulations={state.simulations}
        datasets={state.datasets}
        offers={state.offers}
        refresh={refresh}
        navigate={navigate}
      />
    );
  else if (match)
    content = (
      <SimulationView
        key={match[1]}
        id={match[1]}
        view={match[2]}
        navigate={navigate}
      />
    );
  else if (pathname === "/settings/privacy")
    content = (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">WORKSPACE / PRIVACIDADE</div>
            <h1>Seus dados, sob controle.</h1>
            <p>Minimização, isolamento e transparência.</p>
          </div>
        </div>
        <Card>
          <h2>Como este MVP trata os dados</h2>
          <dl>
            <div>
              <dt>Acesso</dt>
              <dd>Proprietário da sessão privada deste navegador</dd>
            </div>
            <div>
              <dt>Identificadores</dt>
              <dd>HMAC com chave exclusiva do workspace</dd>
            </div>
            <div>
              <dt>Armazenamento</dt>
              <dd>
                Supabase (PostgreSQL); conteúdo criptografado pelo servidor
              </dd>
            </div>
            <div>
              <dt>Dados enviados à IA</dt>
              <dd>
                Somente a descrição e os campos da oferta, quando habilitada
              </dd>
            </div>
            <div>
              <dt>Retenção</dt>
              <dd>
                Até exclusão pelo proprietário; prévias de upload expiram em 1
                hora
              </dd>
            </div>
          </dl>
          <Notice>
            Não inclua dados pessoais na descrição da oferta. Este MVP usa uma
            sessão proprietária por workspace; colaboração e recuperação de
            acesso não estão habilitadas.
          </Notice>
        </Card>
        <Card>
          <h2>Excluir este workspace</h2>
          <p>
            Remove dados importados, ofertas, decisões, eventos e análises
            financeiras deste espaço. A ação é definitiva.
          </p>
          <Field label="Digite EXCLUIR para confirmar">
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </Field>
          <button
            className="danger"
            disabled={confirmation !== "EXCLUIR" || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("privacy/delete", {});
                setState(undefined);
                navigate("/");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Excluir todos os dados do workspace
          </button>
        </Card>
      </>
    );
  else if (pathname !== "/")
    content = (
      <Card>
        <h1>Página não encontrada</h1>
        <button onClick={() => navigate("/")}>Voltar à visão geral</button>
      </Card>
    );
  else
    content = (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">SEU ESPAÇO DE EXPERIMENTAÇÃO</div>
            <h1>
              Antes da próxima decisão,
              <br />
              explore as possibilidades.
            </h1>
            <p>Dados que contextualizam. Cenários que esclarecem.</p>
          </div>
          <button
            className="primary"
            onClick={() => navigate("/simulations/new")}
          >
            <Plus size={17} />
            Nova simulação
          </button>
        </div>
        <div className="hero-grid">
          <Card className="finance-hero">
            <div className="section-title">
              <Badge tone="white">DESAFIO 15</Badge>
              <Calculator size={28} />
            </div>
            <h2>
              Pequenas mudanças.
              <br />
              Impactos que você pode calcular.
            </h2>
            <p>Um produto, um mês e três cenários financeiros lado a lado.</p>
            <div className="mini-chart">
              <span style={{ height: "74%" }} />
              <span style={{ height: "48%" }} />
              <span style={{ height: "60%" }} />
              <div className="chart-line" />
            </div>
            <button onClick={() => navigate("/financials")}>
              Explorar financeiro <ArrowUpRight size={18} />
            </button>
            <small>Fórmulas oficiais pendentes · cálculo demonstrativo</small>
          </Card>
          <Card className="lab-hero">
            <div className="section-title">
              <Badge>CONSUMER LAB</Badge>
              <FlaskConical size={27} />
            </div>
            <h2>
              Uma nova oferta.
              <br />
              Milhares de hipóteses.
            </h2>
            <p>
              Transforme históricos de compra em uma população inspecionável.
            </p>
            <div className="population-art">
              {Array.from({ length: 24 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    background: ["#155e55", "#8ab7aa", "#cba366", "#7896b4"][
                      i % 4
                    ],
                    transform: `translateY(${(i % 3) * 8}px)`,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() =>
                navigate(state.datasets.length ? "/customers" : "/data/import")
              }
            >
              {state.datasets.length
                ? "Explorar população"
                : "Importar minha base"}{" "}
              <ArrowUpRight size={18} />
            </button>
            <small>Comportamento simulado · sem previsão garantida</small>
          </Card>
        </div>
        <div className="metrics">
          <Metric
            label="Bases importadas"
            value={count(state.datasets.length)}
            detail="Versões preservadas"
          />
          <Metric
            label="Perfis na última base"
            value={count(state.datasets.at(-1)?.profileCount ?? 0)}
            detail="Identificadores pseudonimizados"
          />
          <Metric
            label="Ofertas revisadas"
            value={count(state.offers.length)}
            detail="Confirmação humana"
          />
          <Metric
            label="Simulações"
            value={count(state.simulations.length)}
            detail="Decisões rastreáveis"
          />
        </div>
        <Card>
          <div className="section-title">
            <div>
              <h2>Seu laboratório, passo a passo</h2>
              <p className="muted">
                Um fluxo completo para investigar a próxima proposta.
              </p>
            </div>
            <Badge tone="neutral">01 → 04</Badge>
          </div>
          <div className="journey">
            {[
              {
                label: "Importe o histórico",
                text: "CSV, XLSX ou XML, com revisão dos campos.",
                path: "/data/import",
                done: state.datasets.length > 0,
              },
              {
                label: "Conheça a população",
                text: "Perfis e segmentos com evidências observadas.",
                path: "/customers",
                done: state.datasets.length > 0,
              },
              {
                label: "Revise sua oferta",
                text: "Descrição estruturada e lacunas explícitas.",
                path: "/offers/new",
                done: state.offers.length > 0,
              },
              {
                label: "Explore a simulação",
                text: "Resultados sintéticos e um replay em 3D.",
                path: "/simulations/new",
                done: state.simulations.length > 0,
              },
            ].map((s, i) => (
              <button
                className="journey-step"
                key={s.path}
                onClick={() => navigate(s.path)}
              >
                <span className={s.done ? "step-number done" : "step-number"}>
                  {s.done ? "✓" : `0${i + 1}`}
                </span>
                <h3>{s.label}</h3>
                <p>{s.text}</p>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div className="section-title">
            <h2>Simulações recentes</h2>
            <button
              className="text-button"
              onClick={() => navigate("/simulations/new")}
            >
              Criar simulação ↗
            </button>
          </div>
          {state.simulations.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Oferta</th>
                    <th>População</th>
                    <th>Status</th>
                    <th>Criada em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...state.simulations].reverse().map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.offer.title}</strong>
                      </td>
                      <td>{count(s.total)} perfis</td>
                      <td>
                        <Badge>
                          {s.status === "completed"
                            ? "Concluída"
                            : s.status === "partial_failure"
                              ? "Falha parcial"
                              : "Em processamento"}
                        </Badge>
                      </td>
                      <td>
                        {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/simulations/${s.id}/lab`)}
                        >
                          Abrir ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <Activity size={24} />
              <p>Seu primeiro experimento começa com uma base de dados.</p>
              <button onClick={() => navigate("/data/import")}>
                Importar ou usar demonstração →
              </button>
            </div>
          )}
        </Card>
      </>
    );
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <button className="brand" onClick={() => navigate("/")}>
          <span className="brand-icon">s</span>simula
        </button>
        <div className="workspace">
          <span className="workspace-avatar">
            {state.workspace.name[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{state.workspace.name}</strong>
            <small>Workspace privado</small>
          </div>
        </div>
        <span className="nav-label">VISÃO DO NEGÓCIO</span>
        <nav>
          {nav.map((n, i) => (
            <div key={n.path}>
              {i === 2 && <span className="nav-label">CONSUMER LAB</span>}
              <button
                className={
                  pathname === n.path ||
                  (n.path === "/financials" && match?.[2] === "financials") ||
                  (n.path === "/simulations/new" &&
                    match &&
                    match[2] !== "financials")
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => navigate(n.path)}
              >
                <n.icon size={19} />
                {n.label}
                {i === 1 && <span className="nav-pill">15</span>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-note">
            <span className="status-dot" />
            Hipóteses, não certezas.
            <p>Resultados sintéticos para orientar o que investigar.</p>
          </div>
          <button
            className="nav-item"
            onClick={() => navigate("/settings/privacy")}
          >
            <ShieldCheck size={18} />
            Privacidade e dados
          </button>
          <small>SIMULA · MVP 0.1</small>
        </div>
      </aside>
      {menu && (
        <button
          className="overlay"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Workspace</span>
            <span className="slash">/</span>
            <strong>
              {currentNav?.label ?? (match ? "Simulação" : "Privacidade")}
            </strong>
          </div>
          <div>
            <span className="topbar-status">
              <span className="status-dot" />
              Laboratório privado
            </span>
            <span className="user-avatar">
              {state.workspace.name[0]?.toUpperCase()}
            </span>
          </div>
        </header>
        <main>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {content}
          <footer>
            Simula — Consumer Simulation Lab{" "}
            <span>Observações, premissas e resultados sempre separados.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
