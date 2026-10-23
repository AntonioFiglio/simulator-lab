# Simula — Consumer Simulation Lab

**Documento:** visão de produto, conceito e experiência  
**Versão:** 1.0  
**Status:** conceito de produto para o hackathon  
**Referência técnica:** `develop.md`

## 1. Resumo executivo

**Simula é um laboratório de decisões comerciais que combina dados históricos de clientes, simulações assistidas por IA e um mundo 3D isométrico inspirado na linguagem visual de jogos sociais como Habbo.**

A empresa importa seu histórico de vendas, descreve um novo produto ou serviço e explora como diferentes perfis de consumidores *poderiam* reagir à oferta. No laboratório 3D, personagens percorrem um espaço virtual, observam ofertas e representam decisões sintéticas: aceitar, rejeitar ou permanecer indecisos. Um painel permite investigar cada perfil e os resultados agregados.

Além da simulação visual, o Simula possui um **simulador financeiro** para avaliar, em um mesmo mês, como preço, volume vendido e custos afetam o resultado de **um produto**. Essa funcionalidade é a entrega central do **desafio 15 do hackathon**.

**Promessa de produto:** tornar hipóteses comerciais mais compreensíveis, comparáveis e investigáveis **antes** de investir recursos em uma mudança de preço ou lançamento.

**Limite da promessa:** o Simula não lê a mente dos clientes nem comprova, por si só, quantos comprarão uma oferta inédita. Agentes representam hipóteses condicionadas a dados disponíveis, e não consumidores conscientes ou previsões de conversão comprovadas.

## 2. O problema

Empresas acumulam pedidos e cadastros, mas têm dificuldade para transformar esse histórico em decisões sobre:

- Qual oferta apresentar a cada segmento?
- Um desconto melhora o resultado ou reduz a margem?
- O aumento de custos torna um produto menos viável?
- Quais clientes demonstram padrões de compra compatíveis com uma nova oferta?
- O que já sabemos e o que precisamos validar no mercado?

Dashboards tradicionais mostram principalmente o passado. Ferramentas genéricas de IA geram recomendações textuais, muitas vezes sem rastreabilidade. A proposta do Simula é reunir **histórico, hipóteses, cenários e visualização** em uma experiência inspecionável.

## 3. Para quem é

Usuários principais:

- **Dono de pequeno negócio:** avalia preço, desconto, custos e possíveis ofertas.
- **Gestor de e-commerce ou marketplace:** explora padrões de recompra, categorias e segmentos usando arquivos exportados da sua operação.
- **Equipe de produto ou growth:** compara hipóteses antes de conduzir uma campanha ou experimento real.
- **Equipe comercial:** investiga oportunidades de upsell, cross-sell e retenção, sujeitas a validação.

O mercado virtual é **genérico**: funciona com produtos físicos, digitais, serviços e assinaturas. Não exige que a empresa opere supermercado.

## 4. A ideia central: um laboratório de consumidores

O Simula funciona como um **laboratório**, não como um jogo em que o usuário precisa controlar manualmente cada personagem.

Cada consumidor com identificador estável no histórico origina um **perfil analítico**. O perfil contém observações como pedidos anteriores, frequência, ticket médio, categorias compradas e faixas de preço. O sistema pode organizar esses perfis em quatro ou cinco segmentos interpretáveis, sem perder a individualidade dos registros.

Ao criar uma oferta, o usuário apresenta um produto novo em linguagem natural. A IA transforma a descrição em características estruturadas, que o usuário revisa. O motor de simulação aplica premissas e padrões do histórico para produzir decisões sintéticas por perfil.

O espaço 3D, então, torna essas decisões visíveis: os avatares se aproximam da oferta, observam, aceitam ou saem sem comprar. **A animação reproduz uma decisão registrada; não é ela que decide.**

### Três níveis de informação

| Nível | Significado | Como aparece |
|---|---|---|
| **Observado** | Fatos que constam dos arquivos importados | Histórico de pedidos, quantidade, datas, valores |
| **Simulado** | Resultado de regras e agentes aplicados aos perfis | “Este agente aceitou a oferta no cenário” |
| **Estimado e validado** | Previsão estatística calibrada com dados adequados | Apenas em futura funcionalidade, se houver evidência suficiente |

A **taxa de aceitação sintética** é a proporção de agentes simulados que escolheram `buy`. Não deve ser apresentada como taxa real de conversão.

## 5. Como o produto funciona

### Etapa 1 — Importar histórico

O usuário envia arquivos **CSV, Excel (XLSX) ou XML** exportados de sua plataforma ou sistema. O Simula identifica e pede confirmação das colunas: cliente, pedido, produto, data, quantidade e valor, entre outras disponíveis.

A plataforma sinaliza arquivos inconsistentes, pedidos duplicados e dados ausentes. Não é necessário importar nomes, CPF, endereço ou dados pessoais desnecessários. Se não for possível relacionar os pedidos a clientes estáveis, a análise trabalha por transações ou segmentos e deixa isso explícito.

**O que o usuário vê:** quantidade de clientes identificados, período do histórico, categorias, cobertura e qualidade dos dados.

### Etapa 2 — Entender a base

O sistema organiza os consumidores por características observáveis, por exemplo:

- clientes recorrentes;
- consumidores que historicamente compraram em faixas menores de preço;
- compradores de maior ticket;
- exploradores de categorias;
- clientes inativos.

Esses segmentos são etiquetas analíticas, **não diagnósticos de personalidade**. O usuário pode abrir cada perfil para ver de quais compras a classificação derivou.

### Etapa 3 — Descrever uma nova oferta

Exemplo fictício:

> “Quero lançar uma assinatura mensal de R$ 49 que oferece reposição automática de produtos de higiene pet, com facilidade para alterar a frequência.”

O usuário informa nome, descrição, preço, custo, categoria e público pretendido. Um **agente de entendimento da oferta** identifica elementos relevantes e apresenta sua interpretação para revisão. Se faltar informação crítica, o sistema indica a lacuna, em vez de inventar fatos.

### Etapa 4 — Configurar a simulação

O usuário escolhe a população completa ou os segmentos desejados e as premissas do cenário. Uma base de **5.000 clientes** pode produzir **5.000 avaliações lógicas por cenário**. Isso não exige 5.000 modelos de IA ativos ao mesmo tempo.

Cada decisão pode assumir três estados:

- **Compraria na simulação:** a lógica definida para o cenário indica aceitação sintética.
- **Não compraria na simulação:** indica rejeição sintética.
- **Indeciso:** a informação ou as regras não sustentam uma escolha definida.

O usuário pode consultar as justificativas e os elementos do histórico usados na avaliação. Quando a base não sustentar inferências individuais, a interface deve informar baixa evidência, e não inventar confiança.

### Etapa 5 — Assistir ao laboratório 3D

A experiência central é um pequeno mundo **isométrico, estilizado, low-poly/blocado, inspirado na legibilidade e atmosfera social de Habbo, mas com identidade e elementos próprios**.

Em vez de um supermercado obrigatório, o cenário é uma praça/laboratório de pesquisa com estações que exibem produtos ou serviços. Pequenos avatares circulam, aproximam-se da estação da nova oferta, inspecionam o item e manifestam o resultado da simulação.

- **Aceitou:** adiciona o produto ao carrinho ou inventário virtual; serviços podem aparecer como cartões de assinatura.
- **Rejeitou:** observa e se afasta.
- **Indeciso:** permanece em avaliação e se retira sem adicionar a oferta.

Ao clicar no personagem, abre-se um painel com identificador, segmento, compras históricas, decisão simulada e suas razões. O inventário da simulação é separado do histórico real de compras.

**Escalabilidade visual:** o motor pode avaliar 5.000 perfis, enquanto o mundo exibe apenas 20–60 avatares por vez, alternando uma amostra de personagens. O painel deixa visível que os avatares exibidos não são a população inteira.

### Etapa 6 — Interpretar o resultado

O painel apresenta:

- perfis avaliados e cobertura do processamento;
- quantidades de aceitação, rejeição e indecisão sintéticas;
- taxa de aceitação sintética total e por segmento;
- justificativas e evidências relevantes;
- comparação entre cenários e premissas;
- uma lista de hipóteses para validar com vendas, pesquisa ou experimentos reais.

**Exemplo apenas ilustrativo:** numa simulação de 5.000 perfis, 1.800 agentes aceitam, 2.500 rejeitam e 700 ficam indecisos. O painel informa **36% de aceitação sintética**, nunca “36% dos clientes reais comprarão”.

## 6. O papel dos agentes de IA

O produto não depende de um chatbot isolado ou de uma “consciência” artificial por pessoa. É uma arquitetura organizada por funções:

| Função | Responsabilidade |
|---|---|
| **Entendimento da oferta** | Estrutura a descrição livre do novo produto ou serviço |
| **Perfilamento** | Resume atributos do histórico disponível por cliente |
| **Segmentação** | Agrupa perfis semelhantes e documenta os critérios |
| **Motor de decisão** | Aplica regras, modelos ou inferência limitada para obter uma saída por perfil |
| **Explicação** | Traduz a decisão sintética e mostra premissas/evidências |
| **Orquestração** | Processa a população por lotes e organiza os eventos |
| **Reprodução 3D** | Encena eventos e decisões já produzidos pelo motor |

A IA ajuda a interpretar a oferta e formular hipóteses, mas **os cálculos financeiros não dependem de uma opinião do LLM**. A execução deve ser rastreável e permitir distinguir fatos observados de suposições.

## 7. O que torna o 3D relevante

O 3D não é um adorno desconectado do produto. Ele serve para:

1. **Tornar populações compreensíveis:** visualizar segmentos, reações e distribuição de decisões.
2. **Permitir inspeção:** selecionar um avatar e entender qual histórico fundamentou sua resposta.
3. **Comunicar cenários:** observar diferenças entre uma oferta original e uma oferta alterada.
4. **Facilitar apresentações:** demonstrar hipóteses de comportamento de forma intuitiva sem exigir leitura de tabelas extensas.

O mundo 3D deve ser acompanhado de tabelas, métricas e explicações. A experiência é exploratória: sua aparência realista **não aumenta, por si só, a validade dos resultados**.

## 8. Conexão obrigatória com o Hackathon — Desafio 15

**Título oficial do desafio:** Simulador de decisões para um negócio.

**Problema:** mostrar como mudanças comerciais afetam o resultado mensal de uma empresa.

**Entrega mínima:** receber **preço, quantidade vendida e custos**, comparar **três cenários** e apresentar **cálculos e diferenças**.

**Demonstração exigida:** comparar **cenário atual**, **desconto comercial** e **aumento de custos**.

**Limites:** **um produto**, **um período mensal** e **fórmulas fornecidas pela organização**.

### Como o Simula atende

Haverá uma experiência própria chamada **Modo Hackathon 15 — Simulação financeira**. O usuário escolhe um produto e um mês e informa os dados financeiros. O sistema mostra, lado a lado:

| Cenário | O que o usuário faz | O que o sistema apresenta |
|---|---|---|
| **Atual** | Informa preço, quantidade e custos | Resultado mensal de referência |
| **Desconto comercial** | Altera a variável de desconto, segundo as regras fornecidas | Novo cálculo e diferença contra o cenário atual |
| **Aumento de custos** | Altera a variável de custo, segundo as regras fornecidas | Novo cálculo e diferença contra o cenário atual |

A interface exibe as fórmulas aplicadas, os valores de entrada e as diferenças absolutas e percentuais quando definidas no conjunto oficial de fórmulas. **As fórmulas ainda precisam ser fornecidas pela organização; o documento dos desafios não as especifica.** O produto não as apresentará como oficiais antes disso.

A simulação de agentes e o laboratório 3D são o **diferencial adicional**. Eles não substituem nem alteram o escopo da entrega obrigatória.

## 9. Exemplo completo de uso

Uma empresa vende acessórios e itens de higiene para animais. Ela importa cinco mil históricos de consumidores e observa cinco segmentos de comportamento de compra.

O gestor quer lançar uma assinatura de reposição de itens de higiene. Descreve o produto, seu benefício, preço e custo, e revisa como a IA interpretou a oferta.

O laboratório executa uma avaliação sintética por perfil. Na representação 3D, os avatares caminham até uma estação da assinatura, aceitam, rejeitam ou demonstram indecisão. O gestor clica em um avatar que aceitou e vê que seu histórico mostra compras recorrentes de produtos relacionados. Ao selecionar um avatar que rejeitou, observa que há poucas compras similares registradas — uma evidência de baixa afinidade histórica, não prova de desinteresse real.

Em seguida, no Modo Hackathon 15, o gestor analisa o impacto financeiro **de um único produto em um único mês**. Compara a situação atual, uma hipótese de desconto e uma hipótese de aumento de custos. A plataforma apresenta os resultados e suas diferenças conforme as fórmulas oficiais.

O gestor termina com **duas entregas diferentes**: uma comparação financeira verificável e uma lista de hipóteses comportamentais que podem orientar um experimento real.

## 10. Diferenciais pretendidos

- **Histórico como contexto:** decisões sintéticas ligadas a observações da base da empresa.
- **Inspeção individual:** cada avatar está conectado a um perfil lógico auditável.
- **Visualização social 3D:** ambiente intuitivo e memorável, sem obrigatoriedade de mercado/supermercado.
- **Cenários controlados:** alterações de preço e custos comparáveis.
- **Separação clara de evidências:** dados históricos, hipóteses e resultados simulados não se confundem.
- **Escala lógica:** avaliar milhares de perfis sem renderizar milhares de personagens simultaneamente.

Esses diferenciais são objetivos de design do produto, **não vantagens comerciais já comprovadas**.

## 11. Princípios e limites de confiança

1. **Não prometer conversão futura:** simular “compraria” não significa que o cliente realmente comprará.
2. **Não inventar pessoas:** compradores têm perfis analíticos baseados nos dados, não consciência, desejos ou personalidade comprovada.
3. **Não presumir dados indisponíveis:** históricos só de compras não mostram necessariamente visualizações, recusas ou motivo da decisão.
4. **Privacidade por padrão:** identificadores pseudonimizados, dados mínimos, controle de acesso e atenção à LGPD.
5. **Não enviar mensagens nem finalizar transações:** o produto investiga cenários; não compra nem vende em nome do consumidor.
6. **Cenários financeiros separados:** os resultados oficiais do desafio 15 não podem depender de decisões sintéticas não calibradas.

## 12. Escopo de produto

### Primeira versão / Hackathon

- Importação de histórico por CSV/XLSX/XML;
- perfis analíticos e quatro ou cinco segmentos;
- editor para descrever produto ou serviço;
- agente que estrutura a oferta para revisão;
- execução sintética de uma população com até 5.000 consumidores lógicos no cenário demonstrativo;
- visualização isométrica Habbo-like com avatares e estações de oferta;
- painel individual por avatar;
- painel agregado com aceitação, rejeição e indecisão **sintéticas**;
- **modo financeiro completo do desafio 15** com um produto, um mês, três cenários, cálculos e diferenças.

### Evoluções futuras

- Integrações diretas com marketplaces e CRMs;
- catálogo com múltiplas ofertas;
- modelos preditivos calibrados e medição de resultados reais;
- experimentos controlados de preço, retenção e upsell;
- novos ambientes visuais 3D;
- análises agregadas avançadas.

## 13. Como avaliar se o produto realmente gera valor

O sucesso não será medido somente pela quantidade de avatares ou qualidade da animação. Indicadores que importam:

- quanto tempo o usuário leva para montar e comparar três cenários financeiros;
- se consegue entender o motivo de uma decisão simulada e localizar sua evidência;
- se identifica hipóteses comerciais concretas para validar;
- em uma evolução futura, se experimentos reais confirmam ou refutam as hipóteses e geram melhores decisões de negócio.

**Tese de produto:** empresas não precisam de mais uma previsão artificial apresentada como certeza. Precisam de uma ferramenta em que possam **explorar cenários, compreender premissas e decidir o que testar no mundo real**.

---

**Frase de posicionamento:** *Simula — explore o comportamento dos seus consumidores antes de apostar na próxima decisão.*

**Resumo em uma frase:** uma plataforma que combina simulação financeira, agentes baseados em históricos de compra e um laboratório 3D isométrico para investigar o potencial de novas ofertas com transparência sobre seus limites.
