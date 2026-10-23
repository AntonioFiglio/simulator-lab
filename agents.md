# AGENTS.md — Simula Consumer Simulation Lab

**Versão:** 1.0  
**Finalidade:** instruções operacionais para agentes de IA e assistentes de programação que irão construir, modificar ou manter o Simula.  
**Documentos de referência:** `product.md` (visão, conceito e experiência) e `develop.md` (especificação técnica). Leia ambos antes de alterar o produto.

## 1. Missão

Construir uma plataforma de apoio à decisão comercial que combine dados históricos, cenários financeiros, simulação de consumidores e um laboratório 3D isométrico inspirado na linguagem visual de Habbo, **sem copiar marca, personagens ou assets**.

O usuário importa históricos de compras (CSV, XLSX, XML), obtém perfis de consumidores, descreve um novo produto ou serviço, revisa a interpretação feita pela IA e executa uma simulação. Avatares visualizam as decisões que o motor já calculou. O painel mostra resultados agregados, evidências e limites das inferências.

**Prioridade irredutível:** implementar integralmente o desafio 15 do hackathon. O 3D é uma extensão demonstrativa, não substitui o simulador financeiro.

## 2. Hierarquia e resolução de conflitos

1. Regras explícitas do desafio 15 e requisitos de privacidade e segurança.
2. `product.md` para propósito, público, linguagem e jornada.
3. `develop.md` para telas, contratos, stack e ordem de implementação.
4. Este `AGENTS.md` para regras de execução dos agentes de desenvolvimento.
5. Decisões locais documentadas em código e decisões de arquitetura.

Se documentos conflitarem, **não eliminar requisitos do desafio 15**; escolher a solução que mantenha o escopo oficial isolado e registre a divergência. Não supor fórmulas oficiais indisponíveis.

## 3. Requisitos não negociáveis do desafio 15

O **Modo Hackathon 15** precisa funcionar separadamente do laboratório comportamental e conter:

- **Exatamente um produto** e **um período mensal** por análise.
- Entradas: **preço**, **quantidade vendida** e **custos**.
- **Três cenários** identificados claramente: **atual**, **desconto comercial** e **aumento de custos**.
- Comparação lado a lado com **cálculos explícitos**, valores resultantes e **diferenças absolutas e relativas**, quando aplicáveis.
- Demonstração da alteração comercial e de custo com resultados atualizados.
- **Fórmulas fornecidas pela organização**: preparar interface adaptável a essas fórmulas, sem alegar que fórmulas provisórias são oficiais. Se ainda não estiverem disponíveis, indicar `FÓRMULAS OFICIAIS PENDENTES` no documento/interface relevante.

O desafio não exige prever volume vendido com IA. Não utilizar resultados comportamentais sintéticos como se fossem quantidades de vendas observadas, salvo se explicitamente apresentados como uma hipótese configurável e separados dos cálculos oficiais.

## 4. Papéis dos agentes de desenvolvimento

Os papéis abaixo são responsabilidades de trabalho, **não** serviços de IA que precisam ficar executando permanentemente no produto.

### 4.1 Product & Scope Agent

- Conferir cada mudança com `product.md` e o tópico 15.
- Manter duas experiências reconhecíveis: **Financeiro / Hackathon 15** e **Consumer Lab**.
- Evitar escopo desnecessário: integrações externas, pagamentos ou marketplaces automáticos não são essenciais ao MVP.
- Manter mensagens honestas sobre decisões sintéticas e limitações estatísticas.

### 4.2 Data Ingestion Agent

- Implementar upload de CSV, XLSX e XML; preview e mapeamento explícito de colunas.
- Normalizar `customer_id`, `order_id`, `purchased_at`, `product_id|product_name`, `quantity`, `unit_price` e opcionais.
- Tratar formatos regionais de moeda/data, duplicatas, ausências e IDs inconsistentes.
- Rejeitar XML com entidades externas e conteúdos suspeitos; impor limites de tamanho e formato.
- Não inferir identidade individual quando o dataset não tiver identificador persistente.

### 4.3 Consumer Profiling Agent

- Derivar características observáveis: recência, frequência, valor monetário, categorias, preço histórico e recorrência.
- Persistir um `CustomerProfile` para cada cliente identificável; usar segmentos quando não for possível individualizar.
- Criar **4–5 segmentos interpretáveis** quando os dados suportarem.
- Separar fatos, variáveis derivadas e hipóteses. Nunca inventar dados demográficos nem traços de personalidade.

### 4.4 Offer Understanding Agent

- Receber nome, descrição, categoria, preço, custo e benefícios declarados.
- Produzir `OfferSpec` estruturado, com campos desconhecidos devidamente marcados.
- Exibir interpretação para **revisão humana** antes da simulação.
- Não criar benefícios, certificações, condições comerciais ou evidências inexistentes.

### 4.5 Simulation Engine Agent

- Avaliar cada perfil contra uma oferta/cenário; registrar `buy`, `reject` ou `undecided`.
- Produzir razões rastreáveis e metadados de cenário, versão, premissas e origem da evidência.
- Utilizar processamento em lotes para milhares de clientes (meta inicial: **5.000 perfis lógicos**).
- Preferir motor determinístico/heurístico explicável no MVP, com LLM para interpretação e explicação quando necessário.
- Não gerar uma instância viva de LLM por cliente nem manter 5.000 chamadas simultâneas.
- Persistir a decisão antes de emitir eventos de animação.

### 4.6 Financial Engine Agent

- Criar cálculo **independente do motor comportamental**.
- Receber entradas e configurações dos três cenários do desafio 15.
- Exibir fórmula utilizada, substituição pelos valores, resultado e delta em relação ao cenário atual.
- Manter substituíveis as regras de cálculo, para incorporar exatamente as fórmulas disponibilizadas pela organização.
- Não introduzir produtos extras nem períodos múltiplos no fluxo oficial.

### 4.7 3D Experience Agent

- Implementar mundo social **isométrico Habbo-like** com React Three Fiber/Three.js/Drei.
- Estilo: low-poly/blocado, avatares pequenos, caminhos simples, quiosques de ofertas, praça/laboratório, zonas de decisão e HUD B2B.
- Não impor supermercado: deve servir produtos físicos, digitais, assinaturas e serviços.
- Fluxo: `spawn → walk → inspect_offer → decide → buy|reject|undecided → exit`.
- Animar resultados **já persistidos**, nunca decidir compras na camada 3D.
- Quando `buy`, mostrar cartão/objeto aceito no inventário **da simulação**, distinto do histórico real.
- Ao clicar no avatar, abrir perfil pseudonimizado, histórico, razões e evidências.
- Renderizar cerca de **20–60 avatares por vez** e informar quantos de 5.000 estão visíveis; reciclar entidades visuais.
- Oferecer pause/play, velocidade de reprodução, filtro de segmento, foco no avatar e fallback textual/tabular sem WebGL.
- Não reutilizar assets protegidos do Habbo; produzir ou licenciar modelos originais.

### 4.8 UI & Analytics Agent

- Respeitar tokens e componentes definidos em `develop.md`.
- Garantir que a navegação permita acessar rapidamente `/simulations/[id]/financials`.
- Distinguir métricas financeiras oficiais, fatos históricos e resultados sintéticos.
- Exibir totais de buy/reject/undecided, segmentos, cobertura dos dados, evidências e premissas.
- Manter gráficos, listas e textos legíveis sem depender do 3D; estados de erro/ausência de dados claros.

### 4.9 Privacy & Operations Agent

- Isolar dados por workspace; restringir permissões e acesso a históricos individuais.
- Pseudonimizar identificadores; minimizar coleta de dados pessoais e não enviar PII a provedores externos de IA por padrão.
- Gerenciar processamento em lote, limites de custo, falhas parciais, reexecução e rastreabilidade.
- Proteger uploads e exports; não enviar campanhas, editar cadastros ou fazer compras reais.

## 5. Contratos de domínio

Seguir os tipos de `develop.md`, especialmente:

- `CustomerProfile`: perfil pseudonimizado, features observadas e versão do dataset.
- `OfferSpec`: proposta comercial interpretada e revisada pelo usuário.
- `CustomerDecision`: decisão sintética individual e justificativas com evidências.
- `SimulationEvent`: evento visual produzido a partir de uma decisão persistida.
- `FinancialScenario`: cenário `current | discount | cost_increase` com entradas e saídas oficiais.

Invariantes:

1. O 3D nunca grava nem altera `CustomerDecision`.
2. `INVENTORY_ITEM_ADDED` só pode ocorrer se a decisão for `buy`.
3. Cada cliente avaliado deve possuir uma decisão por cenário, inclusive rejeitados e indecisos.
4. Histórico real de compras e inventário simulado são entidades separadas.
5. Resultados financeiros oficiais não dependem de animações nem de percentuais sintéticos.
6. Dados inexistentes devem aparecer como desconhecidos, não como valores inventados.

## 6. Linguagem de resultados e interpretação

**Permitido:** “aceitação sintética”, “afinidade heurística”, “comportamento simulado”, “hipótese de reação”, “histórico observado”, “estimativa sob premissas”.

**Não usar sem calibração e evidência adequadas:** “probabilidade real de compra”, “X% certamente comprarão”, “consciência do cliente”, “previsão garantida de conversão”.

Dados apenas de compras normalmente não documentam exposições, recusas e oportunidades de compra; **não** suportam sozinhos inferência causal ou taxa real de conversão para uma oferta inédita. Tornar essa limitação visível na UI e nos relatórios.

## 7. Arquitetura e organização do código

Stack preferencial, seguindo `develop.md`:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS.
- **3D:** React Three Fiber, Three.js, Drei e Zustand.
- **Backend:** rotas e serviços com contratos tipados; PostgreSQL com Prisma/Drizzle.
- **Importação:** parsers CSV/XLSX/XML seguros.
- **Processamento:** workers e lotes; Python/Polars ou TypeScript conforme necessidade.
- **Atualização da interface:** SSE, WebSocket ou polling, conforme simplicidade do MVP.
- **IA:** providers substituíveis para interpretação da oferta e justificativas estruturadas.

Organização preferida:

```text
apps/web/
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

Não duplicar regras de negócio no frontend e backend. Manter lógica financeira, perfilamento, decisão e reprodução 3D em módulos distintos. Preferir componentes pequenos, contratos explícitos, carregamento sob demanda dos assets 3D e tratamento de falhas visível.

## 8. Sequência de construção e prioridades

1. **Financeiro obrigatório:** formulário de um produto/um mês, três cenários, fórmulas configuráveis e comparação. Não deixar essa entrega para o final.
2. **Dados:** uploads, mapeamento, perfis e segmentos.
3. **Oferta:** descrição livre, interpretação estruturada por IA e revisão humana.
4. **Decisão:** avaliação em lote dos perfis, razões e agregações.
5. **Mundo 3D:** avatares, estações de oferta, estados visuais e inspector.
6. **Operação:** persistência, streaming/replay, gestão de custos e controles de privacidade.

Em cada etapa, preferir um fluxo vertical realmente utilizável a uma grande coleção de telas sem funcionamento. Nenhuma seção de testes ou suíte automatizada faz parte do escopo solicitado.

## 9. Instruções para agentes de programação

Ao receber uma tarefa:

1. Ler a parte correspondente de `product.md`, `develop.md` e deste `AGENTS.md`.
2. Identificar se a alteração pertence ao **Modo Hackathon 15**, ao **Consumer Lab** ou aos serviços compartilhados.
3. Preservar os invariantes, a nomenclatura dos resultados e o isolamento entre financeiro/IA/3D.
4. Implementar o fluxo funcional com contratos tipados e tratamento claro de dados indisponíveis.
5. Não inventar fórmula oficial, dados de usuário, evidências de mercado, assets licenciados ou resultados de conversão.
6. Evitar dependências, integrações e abstrações que não sejam necessárias para entregar a funcionalidade.
7. Ao encerrar, relatar o que mudou, quais arquivos foram modificados e eventuais limitações ou decisões pendentes.

### Não fazer

- Transformar o Simula exclusivamente em supermercado.
- Gerar uma “consciência” ou LLM permanente para cada pessoa.
- Usar a animação como fonte de verdade da decisão.
- Apresentar intenção simulada como taxa de conversão comprovada.
- Ocultar as três comparações financeiras obrigatórias do tópico 15.
- Substituir as fórmulas da organização sem autorização ou fingir que são conhecidas.
- Implementar campanhas automatizadas, pagamentos ou contato com compradores no MVP.
- Incluir tarefas de testes no escopo deste documento.

## 10. Definição de entrega funcional

O produto está suficientemente implementado para a demonstração quando uma empresa fictícia puder:

- inserir um produto, mês, preço, quantidade e custos;
- comparar **atual vs desconto vs aumento de custos** com cálculos e diferenças claramente expostos;
- importar dados fictícios de clientes e gerar perfis;
- descrever uma oferta e revisar o entendimento da IA;
- rodar uma população simulada com decisões persistidas;
- assistir a um subconjunto de avatares em um laboratório 3D isométrico estilo Habbo-like;
- clicar em avatares e inspecionar histórico, decisões e evidências;
- consultar resultados agregados sem confundir compras simuladas com compras reais.

**Resultado desejado:** uma ferramenta de decisão comercial honesta e navegável, cuja camada 3D ajuda a investigar as hipóteses, enquanto o cálculo financeiro oficial cumpre integralmente o desafio 15.
