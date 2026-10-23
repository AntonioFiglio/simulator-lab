# Simula — Consumer Simulation Lab

**Versão:** 2.1  
**Status:** especificação de produto e implementação  
**Objetivo:** construir uma plataforma em que a empresa importa históricos de clientes, descreve um novo produto ou serviço e observa, em um ambiente 3D de estilo **Habbo-like isométrico**, avatares representando decisões sintéticas de interesse, rejeição ou compra simulada.

> **Princípio fundamental:** o ambiente 3D é a representação visual da execução; não é o mecanismo que decide compras. Cada avatar corresponde a um cliente pseudonimizado quando há identificador estável ou a um perfil sintético/segmento quando não há. Uma decisão simulada não é uma compra real e o percentual de agentes que escolheram comprar **não é uma probabilidade calibrada de conversão**.

---

## 1. Enquadramento no hackathon

### Desafio 15 — Simulador de decisões para um negócio

O enunciado do tópico 15 exige:

- **Receber preço, quantidade vendida e custos**;
- **Permitir comparar três cenários**;
- **Apresentar os cálculos e diferenças**;
- **Demonstrar comparação entre cenário atual, desconto comercial e aumento de custos**;
- **Limite de escopo:** um produto, um período mensal e fórmulas fornecidas pela organização.

### Como o Simula cumpre integralmente o tópico 15

O produto terá **dois modos complementares**:

1. **Modo Hackathon 15 (obrigatório e principal para a banca)**  
   Fluxo estritamente aderente ao desafio. Trabalha com:
   - **1 produto**;
   - **1 período mensal**;
   - entrada manual ou importada de **preço**, **quantidade vendida** e **custos**;
   - **3 cenários obrigatórios**:
     - cenário atual;
     - desconto comercial;
     - aumento de custos;
   - exibição explícita de **cálculos**, **diferenças** e **comparação lado a lado**;
   - uso de **fórmulas fornecidas pela organização** quando disponibilizadas.

2. **Modo Consumer Simulation Lab (camada de diferenciação)**  
   Extensão conceitual do produto com agentes, perfis de clientes e visualização 3D isométrica estilo Habbo-like. Essa camada **não substitui** o cumprimento do desafio 15; ela adiciona valor e demonstra visão de produto.

### Mapeamento direto dos requisitos do tópico 15

| Requisito do desafio 15 | Como o produto atende |
|---|---|
| Receber preço, quantidade vendida e custos | Formulário estruturado e/ou importação de dados |
| Comparar três cenários | Tela fixa com 3 cenários: atual, desconto comercial e aumento de custos |
| Apresentar cálculos e diferenças | Painel financeiro com fórmulas, resultados e delta entre cenários |
| Demonstrar cenário atual vs desconto vs aumento de custos | Roteiro de demonstração obrigatório |
| Um produto | Modo Hackathon trabalha com apenas 1 produto por simulação |
| Um período mensal | Cada simulação financeira usa exatamente 1 mês |
| Fórmulas fornecidas | Motor financeiro pluggable que recebe as fórmulas oficiais |

### Regra de produto

A banca deve conseguir avaliar o projeto **mesmo sem entrar no 3D**. O núcleo do desafio 15 precisa ficar claramente visível em uma tela financeira própria.

---

## 2. Visão e proposta de valor

**Pergunta central do produto:**  
“Se eu ajustar preço, custos ou criar uma nova oferta, como isso afeta o resultado mensal do meu negócio e como diferentes perfis de clientes podem reagir?”

O Simula funciona para e-commerce, assinatura, varejo, serviços, infoprodutos, marketplaces e operações B2B, desde que os dados enviados sejam suficientes para análise.

O valor entregue tem três camadas:

1. **Financeira oficial** — cálculo do desafio 15 com três cenários comparáveis.
2. **Comportamental sintética** — perfis de consumidores simulados com base no histórico enviado.
3. **Visual 3D explorável** — representação estilo Habbo-like dos comportamentos simulados.

Nunca apresentar a camada 2 ou 3 como se fossem validação estatística real de conversão.

---

## 3. Direção criativa do 3D

### Estilo visual

O ambiente 3D deve seguir uma linguagem **inspirada em Habbo**, mas sem copiar assets, personagens, interface, marcas ou elementos proprietários.

#### Características obrigatórias

- **Câmera isométrica fixa ou semi-fixa**;
- **visual low-poly / pixel-like / blocado**;
- **avatares pequenos e estilizados**, com leitura clara à distância;
- **movimentação simples em grid ou semi-grid**;
- **ambiente social/laboratorial**, com sensação de “mini-mundo simulado”; 
- **HUD analítico moderno**, sobreposto ao mundo 3D.

### Interpretação correta do estilo

Não construir um clone de Habbo. O objetivo é usar:
- sensação de miniatura social;
- leitura fácil dos personagens;
- ambiente divertido e acessível;
- organização espacial clara.

### Cenário recomendado

Em vez de supermercado obrigatório, usar um **Consumer Simulation Lab** com:

- praça central;
- estações de oferta/produto;
- painéis de decisão;
- zonas de observação;
- trilhas por onde os avatares caminham;
- áreas visuais para “compra simulada”, “rejeição” e “indecisão”.

### Linguagem visual do avatar

Cada avatar representa um cliente ou um perfil lógico. Ele pode:
- caminhar pelo laboratório;
- aproximar-se de uma estação de oferta;
- inspecionar o produto;
- aceitar, rejeitar ou ficar indeciso;
- carregar um **ícone/cubo/cartão** que representa o produto aceito.

O avatar **não** precisa parecer com a pessoa real nem inferir gênero, idade, renda ou etnia.

---

## 4. Jornada principal

### Passo A — Importar dados

1. Usuário cria um workspace e escolhe **Importar clientes**.
2. Faz upload de `CSV`, `XLSX` ou `XML`.
3. Um assistente identifica colunas e sugere mapeamento.
4. O usuário revisa campos, inconsistências e duplicatas.
5. O sistema cria uma entidade por `customer_id` estável, com histórico de pedidos, categorias, valores, itens e datas.
6. O painel informa qualidade de dados e cobertura da base.

**Campos mínimos preferenciais:**
- `customer_id`
- `order_id`
- `purchased_at`
- `product_id` ou `product_name`
- `quantity`
- `unit_price`

**Campos complementares:**
- `category`
- `unit_cost`
- `discount`
- `channel`
- `view`
- `add_to_cart`
- `not_purchased`

Se não houver identificador persistente, o sistema passa a trabalhar com **segmentos** em vez de indivíduos.

---

### Passo B — Construir a população

1. Sistema calcula `recency`, `frequency`, `monetary`, faixa de preço, recorrência e afinidades observadas.
2. Cada cliente vira um `ConsumerProfile` persistido.
3. O sistema gera **4 ou 5 perfis principais** de consumidores.
4. O usuário pode navegar por segmento ou cliente individual.
5. A base pode conter **5.000 clientes lógicos ou mais**, mesmo que o 3D mostre apenas uma amostra visual.

Exemplos de perfis:
- recorrentes;
- sensíveis a preço;
- ticket alto;
- exploradores de categorias;
- inativos/ocasionalmente reativáveis.

---

### Passo C — Construir a nova oferta por chat

- Conversa curta com modelo fixo `gpt-4o-mini`, via Chat Completions com Structured Outputs e validação Zod. Prompt versionado em `packages/offer-understanding/chat.ts`.
- Roteiro adaptativo: ideia/público/problema → tipo/categoria/benefícios → preço/custo opcional → ficha revisável. Meta de 3–5 interações, sem repetir informações nem inventar dados.
- `OfferDraft`: campos de `OfferSpec` com desconhecidos representados por `null`; benefícios são uma lista, podendo estar vazia. Sugestões pendentes ficam separadas. Tipo e preço não recebem defaults inventados. Unidade/periodicidade ficam na descrição.
- Ficha: nome, descrição livre, tipo, categoria, preço (R$), custo unitário opcional, benefícios por linha e público desejado opcional. Obrigatórios para confirmar: nome, descrição de ao menos 10 caracteres, tipo e preço não negativo. Categoria desconhecida não impede conclusão.
- `GET /api/offer/chat`: recupera conversa atual do workspace. `POST /api/offer/chat`: mensagem, nova conversa ou confirmação explícita. Revisão numérica detecta alterações em outra aba. Confirmar não executa a simulação; ID estável por revisão evita duplicação em retries.
- Registro `offer_chat/current` armazenado como JSON no Supabase, sem chave de criptografia da aplicação para novos registros. Registros antigos criptografados exigem a chave original para leitura. Mensagens só são persistidas junto com uma resposta válida; falhas preservam o histórico e o texto digitado. Edições manuais entram no próximo envio ou confirmação. Uma conversa atual por workspace, até 20 respostas do usuário.
- `POST /api/offer/transcribe`: multipart autenticado, arquivo de até 8 MB (WebM/MP4/OGG/WAV/MP3), timeout de 30 s. MediaRecorder limita a gravação na interface a 60 s e libera o microfone ao parar/sair. Áudio não é persistido pela aplicação. A transcrição é editável e nunca enviada automaticamente ao chat.
- `OPENAI_API_KEY` somente no servidor. `OFFER_TRANSCRIPTION_MODEL` configura a transcrição separadamente (default `gpt-4o-mini-transcribe`). Ausência de chave ou falha da IA é visível; não há resposta fictícia substituindo o modelo. Ficha manual permanece utilizável.
- Limites: 4.000 caracteres por mensagem, 1.800 tokens de saída, 30 s por chamada e 60 chamadas de IA/hora/workspace, incluindo transcrições e tentativas. Lock em processo exige uma réplica, assim como o worker do MVP. Exclusão do workspace aguarda solicitações ativas e remove conversas/cotas junto dos demais registros.
- O cliente nunca determina prompts de sistema nem fornece histórico com papéis arbitrários. Histórico observado e decisões da simulação não entram na conversa.

---

### Passo D — Executar a simulação

1. Selecionar população total ou segmentos específicos.
2. Definir cenário.
3. O `Simulation Orchestrator` processa os perfis em lotes.
4. Para cada cliente, registrar:
   - `buy`
   - `reject`
   - `undecided`
5. Registrar razões, evidências, cenário, seed e versão do motor.
6. Gerar agregações para o painel analítico.

A execução de 5.000 clientes significa **5.000 decisões lógicas**, não 5.000 LLMs ativos nem 5.000 modelos 3D na tela.

---

### Passo E — Visualizar o laboratório 3D

Ao iniciar a simulação, o usuário entra em um mundo 3D com estilo **Habbo-like isométrico**, com:

- avatares caminhando em rotas simples;
- estações de oferta;
- inspeção visual do produto;
- decisão animada;
- exibição do item aceito no inventário visual do avatar;
- áreas do mapa que representam aceitação, rejeição e indecisão.

Fluxo visual do avatar:

`spawn → walk → inspect_offer → decide → buy/reject/undecided → exit`

#### Compra simulada

Se o motor registrar `buy`, o avatar recebe um item visual associado ao novo produto.

#### Rejeição simulada

Se o motor registrar `reject`, o avatar observa a oferta e segue adiante.

#### Indecisão simulada

Se o motor registrar `undecided`, o avatar permanece alguns segundos em uma zona intermediária e sai sem item.

#### Interação do usuário

Ao clicar em um avatar, abrir painel com:
- ID pseudonimizado;
- segmento;
- histórico observado;
- decisão simulada;
- razões;
- evidências;
- item aceito, se houver.

---

### Passo F — Interpretar os resultados

Mostrar:
- total de clientes avaliados;
- quantidade que simulou compra;
- quantidade que simulou rejeição;
- quantidade indecisa;
- taxa de aceitação sintética;
- distribuição por segmento;
- comparações entre cenários;
- insights por cliente e perfil.

Separadamente, no **Modo Hackathon 15**, mostrar:
- preço;
- quantidade vendida;
- custos;
- 3 cenários;
- cálculos completos;
- diferenças entre cenários;
- resultado mensal.

---

## 5. Estrutura funcional obrigatória do Modo Hackathon 15

### Objetivo

Garantir aderência total ao desafio.

### Entradas obrigatórias

- Produto: **apenas um**
- Período: **um mês**
- Preço atual
- Quantidade vendida atual
- Custos atuais

### Cenários obrigatórios

1. **Cenário atual**
2. **Cenário com desconto comercial**
3. **Cenário com aumento de custos**

### Saídas obrigatórias

Para cada cenário:
- receita;
- custos;
- resultado/margem/contribuição (de acordo com a fórmula oficial);
- diferença em relação ao cenário atual;
- comparação visual lado a lado.

### Regra de exibição

A plataforma precisa ter uma tela `/financials` onde qualquer jurado veja imediatamente:
- os 3 cenários;
- os cálculos;
- os deltas;
- o impacto mensal.

### Regras de implementação

- Não permitir mais de 1 produto no Modo Hackathon.
- Não permitir múltiplos meses no mesmo cálculo oficial.
- Não substituir as fórmulas da organização por fórmulas inventadas quando as oficiais forem fornecidas.
- Permitir que o Consumer Lab use esses mesmos cenários como contexto adicional, mas não confundir visualização lúdica com cálculo oficial.

---

## 6. Design system

### Identidade

`Simula — Consumer Simulation Lab`

Estética: mistura de:
- jogo social isométrico estilo Habbo-like;
- dashboard analítico B2B;
- clareza de software de decisão.

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#155E55` | ações principais |
| `--primary-soft` | `#DDF3EA` | realces suaves |
| `--ink` | `#101828` | textos |
| `--canvas` | `#F5F7F9` | fundo |
| `--surface` | `#FFFFFF` | cards |
| `--border` | `#E5E9EF` | divisores |
| `--info` | `#2563EB` | informações |
| `--warning` | `#B7791F` | dados insuficientes |
| `--danger` | `#C0392B` | erros |

### Tipografia

- **Inter** ou **Geist**
- títulos: 24–32 px
- corpo: 14–16 px
- labels: 12–13 px
- numerais tabulares para métricas

### Layout

- sidebar: 240 px
- topbar: 64 px
- viewport 3D central
- painel inspector lateral: 360–400 px
- fallback tabular para dispositivos sem WebGL

### Componentes

- `AppShell`
- `DataImportWizard`
- `ColumnMapper`
- `PopulationOverview`
- `OfferComposer`
- `OfferSpecReview`
- `SimulationSetup`
- `ConsumerLabViewport`
- `Avatar3D`
- `OfferStation3D`
- `AvatarInspector`
- `PurchaseHistoryPanel`
- `SimulatedInventory`
- `PopulationMetrics`
- `ScenarioComparison`
- `FinancialScenarioTable`
- `CaveatBanner`

### Estados

- idle
- importing
- parsing
- profiling
- ready
- executing
- paused
- completed
- partial_failure
- error
- insufficient_data

---

## 7. Mundo 3D — especificação técnica

### Direção de arte

- estilo isométrico, inspirado em Habbo-like;
- low-poly com leitura limpa;
- avatares pequenos e simpáticos;
- ambiente modular de laboratório;
- objetos simples, blocados e legíveis;
- animações leves.

### Ambiente base

- praça central;
- estações de produto;
- painéis digitais;
- corredores curtos;
- zonas de decisão;
- área de saída.

### Performance e escala

- renderizar cerca de 20–60 avatares simultaneamente;
- usar **instanced meshes** quando aplicável;
- reciclar visualmente avatares enquanto 5.000 decisões são processadas;
- manter agregações consistentes com a população total.

### Regra de integridade

O 3D apenas lê `SimulationEvent`.  
Ele **não escreve** decisão comercial.

---

## 8. Arquitetura de agentes

### Princípio arquitetural

Cada cliente possui uma identidade analítica persistente, não uma consciência humana real.

### Componentes

1. `Ingestion Service`
2. `Customer Profiler`
3. `Segmentation Engine`
4. `Offer Understanding Agent`
5. `Decision Engine`
6. `Simulation Orchestrator`
7. `3D Replay Engine`
8. `Analytics Service`
9. `Financial Engine` (para o desafio 15)

### Estratégia prática para 5.000 clientes

- criar perfis estruturados para 5.000 clientes;
- avaliar por lotes;
- usar heurística + IA explicativa;
- permitir replay com seed;
- persistir decisões e eventos.

---

## 9. Contratos TypeScript

```ts
type Decision = 'buy' | 'reject' | 'undecided';
type EvidenceType = 'observed' | 'assumption' | 'ai_hypothesis';

type CustomerProfile = {
  id: string;
  segmentId?: string;
  features: {
    ordersCount: number;
    totalSpent: number;
    averageOrderValue: number;
    daysSinceLastPurchase?: number;
    favoriteCategories: string[];
    usualPriceRange?: [number, number];
  };
  purchaseHistoryIds: string[];
  datasetVersion: string;
};

type OfferSpec = {
  id: string;
  title: string;
  description: string;
  kind: 'physical' | 'digital' | 'service' | 'subscription';
  category?: string;
  price: number;
  unitCost?: number;
  statedBenefits: string[];
  inferredHypotheses: string[];
  humanReviewed: boolean;
};

type CustomerDecision = {
  simulationId: string;
  scenarioId: string;
  customerId: string;
  decision: Decision;
  affinityScore?: number;
  reasons: { text: string; basis: EvidenceType; sourceIds?: string[] }[];
  modelVersion: string;
  createdAt: string;
};

type FinancialScenario = {
  id: string;
  name: 'current' | 'discount' | 'cost_increase';
  productId: string;
  monthRef: string;
  price: number;
  quantitySold: number;
  cost: number;
  outputs: Record<string, number>;
};

type SimulationEvent =
  | { type: 'AVATAR_SPAWN'; at: number; customerId: string }
  | { type: 'AVATAR_MOVE'; at: number; customerId: string; waypoint: string }
  | { type: 'OFFER_INSPECTED'; at: number; customerId: string; offerId: string }
  | { type: 'DECISION_SHOWN'; at: number; customerId: string; decision: Decision }
  | { type: 'INVENTORY_ITEM_ADDED'; at: number; customerId: string; offerId: string }
  | { type: 'AVATAR_EXIT'; at: number; customerId: string };
```

---

## 10. Modelagem de dados

- `Workspace(id, name, owner_id)`
- `DataSource(id, workspace_id, name, format, mapping_json, status, version)`
- `Customer(id, workspace_id, external_id_hash, profile_json, segment_id)`
- `Order(id, customer_id, purchased_at, total_amount, source_id)`
- `OrderItem(id, order_id, product_id, quantity, unit_price)`
- `Product(id, name, category, price, unit_cost)`
- `Offer(id, workspace_id, spec_json, created_at)`
- `Segment(id, workspace_id, name, definition_json)`
- `Simulation(id, workspace_id, offer_id, dataset_version, engine_version, seed, status)`
- `Scenario(id, simulation_id, parameters_json, mode)`
- `CustomerDecision(id, simulation_id, scenario_id, customer_id, decision, evidence_json)`
- `SimulationEvent(id, simulation_id, scenario_id, customer_id, time_offset_ms, payload_json)`
- `FinancialScenario(id, simulation_id, name, product_id, month_ref, inputs_json, outputs_json)`
- `SimulationAggregate(id, scenario_id, totals_json, caveats_json)`

---

## 11. Rotas e telas

| Rota | Função |
|---|---|
| `/` | Dashboard |
| `/data/import` | Importação e mapeamento |
| `/customers` | População e segmentos |
| `/offers/new` | Criar nova oferta |
| `/simulations/new` | Configurar simulação |
| `/simulations/[id]/lab` | Laboratório 3D isométrico |
| `/simulations/[id]/results` | Resultados sintéticos |
| `/simulations/[id]/financials` | Tela oficial do desafio 15 |
| `/settings/privacy` | Privacidade e retenção |

### Wireframe resumido do `/lab`

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Simula / Consumer Lab / Oferta X                         ● Executando      │
├───────────────┬────────────────────────────────────────┬────────────────────┤
│ Segmentos     │                                        │ Consumidor #0482   │
│ ● Recorrentes │          LAB 3D HABBO-LIKE             │ Histórico observado│
│ ● Preço       │                                        │ 7 pedidos          │
│ ● Premium     │ avatar → estação → decisão             │ Ticket: R$ 180     │
│ ● Explorador  │                                        │                    │
│ ● Inativos    │                                        │ Decisão simulada   │
│               │                                        │ COMPRARIA          │
│ Filtros       │                                        │ Razões / evidências│
├───────────────┴────────────────────────────────────────┴────────────────────┤
│ Avaliados: 3.420 / 5.000 | Compra: 1.245 | Rejeição: 1.880 | Indecisos: 295 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe resumido do `/financials`

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Simula / Hackathon 15 / Financial Scenarios                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Produto: X | Período: Outubro/2026 | Escopo: 1 produto / 1 mês            │
├────────────────┬────────────────────┬────────────────────┬─────────────────┤
│                │ Cenário Atual      │ Desconto Comercial │ Aumento de Cust.│
├────────────────┼────────────────────┼────────────────────┼─────────────────┤
│ Preço          │ R$ ...             │ R$ ...             │ R$ ...          │
│ Quantidade     │ ...                │ ...                │ ...             │
│ Custos         │ R$ ...             │ R$ ...             │ R$ ...          │
│ Resultado      │ R$ ...             │ R$ ...             │ R$ ...          │
│ Diferença      │ Base               │ Δ ...              │ Δ ...           │
└────────────────┴────────────────────┴────────────────────┴─────────────────┘
```

---

## 12. Tecnologias recomendadas

- **Web:** Next.js, React, TypeScript, Tailwind CSS
- **3D:** React Three Fiber, Three.js, Drei
- **Estado:** Zustand
- **Parsing:** Papa Parse, XLSX parser, XML parser seguro
- **Persistência:** PostgreSQL + Prisma/Drizzle
- **Processamento:** Python + Polars/Pandas ou engine TypeScript com workers
- **Jobs:** fila assíncrona + SSE/WebSocket
- **Gráficos:** Recharts
- **IA:** providers desacoplados para interpretação de oferta e geração de justificativas

---

## 13. Métricas e interpretação

| Métrica | Cálculo | Interpretação |
|---|---|---|
| Consumidores avaliados | registros com decisão | cobertura |
| Compras simuladas | `decision === buy` | saída sintética |
| Rejeições simuladas | `decision === reject` | saída sintética |
| Indecisos | `decision === undecided` | saída sintética |
| Taxa de aceitação sintética | compras simuladas / avaliados | não é conversão real |
| Resultado mensal oficial | fórmula da organização | cumprimento do tópico 15 |
| Diferença entre cenários | cenário - atual | comparação obrigatória |

### Observação crítica

Se os dados não incluírem exposição ou não-compra, o sistema não deve prometer “probabilidade real de compra”. Deve apresentar somente:
- afinidade sintética;
- saída simulada;
- hipóteses explicáveis.

---

## 14. Segurança e privacidade

- pseudonimização de IDs;
- mínimo de PII possível;
- separação por workspace;
- controle de acesso por papel;
- criptografia em trânsito e repouso;
- não enviar PII para LLMs por padrão;
- proteção contra XML external entities e arquivos maliciosos;
- transparência entre `observed`, `assumption` e `ai_hypothesis`.

---

## 15. Escopo do MVP

### Obrigatório

- importação CSV/XLSX/XML;
- criação de perfis por cliente;
- 4 ou 5 segmentos;
- criação de oferta via descrição livre;
- interpretação estruturada da oferta pela IA;
- motor de decisão em lote;
- 5.000 decisões lógicas por cenário;
- laboratório 3D estilo Habbo-like com 20–60 avatares visíveis;
- clique no avatar para inspeção;
- painel agregado de resultados;
- **modo oficial do desafio 15 com 3 cenários financeiros**.

### Depois

- múltiplas skins do laboratório;
- integração com marketplaces;
- múltiplas ofertas;
- modelos calibrados com eventos reais;
- relatórios avançados.

### Fora do MVP

- consciência real de cliente;
- previsão garantida de compra;
- campanhas automáticas;
- integração de pagamento;
- renderização literal de 5.000 personagens simultaneamente.

---

## 16. Ordem de implementação

**Marco 1 — Dados:** ingestão, mapeamento, perfis e segmentos.  
**Marco 2 — Oferta:** chat breve com GPT-4o-mini, voz transcrita e ficha com revisão humana.
**Marco 3 — Decisão:** motor em lote, cenários e agregações.  
**Marco 4 — 3D:** laboratório isométrico Habbo-like, avatares e replay.  
**Marco 5 — Financeiro:** tela oficial do desafio 15 com os 3 cenários.  
**Marco 6 — Operacional:** privacidade, exportação, robustez e fallback 2D.

---

## 17. Estrutura sugerida do repositório

```text
apps/web/
  app/(dashboard)/
  app/data/import/
  app/customers/
  app/offers/new/
  app/simulations/new/
  app/simulations/[id]/lab/
  app/simulations/[id]/results/
  app/simulations/[id]/financials/
  components/design-system/
  components/lab-3d/
  components/analytics/
packages/
  contracts/
  ingestion/
  profiling/
  simulation-core/
  offer-understanding/
  financial-engine/
services/
  workers/
```

---

## 18. Roteiro de apresentação

1. Importar dados de clientes fictícios.
2. Mostrar 4–5 perfis derivados.
3. Criar um novo produto/serviço por descrição.
4. Revisar a estrutura gerada pela IA.
5. Rodar a simulação comportamental.
6. Entrar no laboratório 3D Habbo-like e observar os avatares.
7. Clicar em alguns avatares para inspecionar decisão e histórico.
8. Abrir a tela financeira oficial.
9. Demonstrar os três cenários obrigatórios do desafio 15.
10. Mostrar cálculos, diferenças e impacto mensal.
11. Encerrar explicando que o 3D é uma representação exploratória, enquanto a tela financeira é o núcleo oficial do desafio.

---

## 19. Diretriz final de produto

Construir uma plataforma em que:

- o **núcleo oficial** resolve integralmente o **desafio 15**;
- a **camada de diferenciação** usa agentes e visualização 3D;
- o **mundo visual** adota estética **Habbo-like isométrica**, sem copiar o original;
- cada cliente importado tem um perfil lógico e uma decisão registrada;
- o usuário consegue entender tanto o **impacto financeiro mensal** quanto a **reação sintética da base**.

A experiência deve ser clara: **primeiro a decisão de negócio, depois a simulação visual que ajuda a interpretá-la**.
