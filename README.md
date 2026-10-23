# Simula — Consumer Simulation Lab

MVP do simulador comercial com persistência exclusiva no Supabase descrito em `product.md`, `develop.md` e `agents.md`. Duas experiências separadas: **Financeiro / Hackathon 15** e **Consumer Lab**.

**FÓRMULAS OFICIAIS PENDENTES.** Os documentos não contêm as fórmulas da organização. O motor disponível é demonstrativo e não representa homologação do desafio. O chat de nova oferta utiliza GPT-4o-mini e requer `OPENAI_API_KEY`; sem a chave, a ficha pode ser preenchida manualmente.

## Executar

Requer Node.js 22, npm e um projeto Supabase hospedado (plano Free compatível).

1. Crie um projeto no Supabase e execute `supabase/migrations/202610230001_simula_records.sql` no SQL Editor. A migration é reaplicável e cria a tabela, o trigger e as permissões.
2. Copie `.env.example` para `apps/web/.env.local`.
3. Configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (ou a chave legada `SUPABASE_SERVICE_ROLE_KEY`) e `SIMULA_ENCRYPTION_KEY`. Gere a chave de criptografia com `openssl rand -hex 32`; preserve-a durante todos os deploys.
4. Nunca use o prefixo `NEXT_PUBLIC_` para as chaves de servidor.

```sh
npm ci
npm run dev
```

Se preferir Yarn, use `yarn install` e `yarn dev`. A configuração `.yarnrc.yml` usa `node-modules` para compatibilidade com o Turbopack.

Abra http://127.0.0.1:3000. Crie um workspace e use **Importar dados → Carregar demonstração** para trabalhar com 5.000 perfis fictícios. A base demonstrativa é armazenada no seu projeto Supabase. Nenhum perfil é enviado a provedores de IA.

```sh
npm run typecheck
npm run build
npm start
```

Pare `dev` antes de iniciar `start`. Os scripts mantêm o servidor restrito ao endereço local; a persistência é remota. Sem configuração válida, a API retorna erro 503 explicativo e não cria um banco alternativo.

## Deploy na Vercel

Mantenha o **Root Directory** na raiz do repositório (`.`), onde estão `package.json` e `vercel.json`. A configuração versionada define o framework Next.js, executa `npm run build` e informa **Output Directory: `apps/web/.next`**. O script compila `apps/web`; por isso a saída não fica em `.next` na raiz.

Inclua `vercel.json` no commit enviado à Vercel. Isso corrige o erro de diretório de saída ausente em `/vercel/path0/.next`. Configure as variáveis de servidor no ambiente correspondente da Vercel.

## Jornada disponível

1. **Financeiro:** informe um produto, um mês, preço unitário, quantidade vendida e custos totais mensais. Ajuste desconto e aumento de custos. Veja três cenários lado a lado, fórmulas, substituições, resultados e diferenças absolutas/relativas. Salve e recarregue análises.
2. **Importação:** envie CSV, XLSX ou XML; revise a prévia e o mapeamento; escolha Brasil ou internacional. Exemplos fictícios nos três formatos estão disponíveis na tela e em `apps/web/public/examples/`.
3. **População:** consulte qualidade, identificação, duplicatas, rejeições, segmentos e perfis com histórico. Transações sem cliente persistente aparecem agregadas por categoria e não são transformadas em indivíduos inventados.
4. **Oferta:** converse por texto ou voz com GPT-4o-mini. Em cerca de 3–5 interações, revise a ficha editável com nome, descrição, tipo, categoria, preço, custo opcional, benefícios e público opcional. A transcrição aparece para revisão antes do envio. Confirme para configurar a simulação; ela não começa automaticamente.
5. **Simulação:** escolha base, oferta revisada, população/segmentos e parâmetros. O motor processa lotes de 250 e registra uma decisão por cliente por cenário. A base demonstrativa gera **15.000 decisões: 5.000 × 3 cenários**.
6. **Laboratório:** mundo isométrico original, até 36 avatares por amostra, reprodução das decisões persistidas, cartões de inventário apenas para aceitação, seleção/inspector, pausa, velocidade, foco e alternativa tabular. A seed controla a ordem visual; as decisões são determinísticas.
7. **Resultados:** totais, aceitação sintética, comparação dos cenários, distribuição por segmento, cobertura, fontes e exportação JSON.
8. **Privacidade:** informações de retenção e exclusão confirmada de todos os registros do workspace.

## Financeiro

O custo informado é o **total mensal**, não o custo por unidade. A quantidade permanece fixa nos três cenários e não depende da população simulada.

Regras provisórias:

- Receita = preço × quantidade.
- Resultado = receita − custos totais mensais.
- Desconto altera somente o preço; aumento de custos altera somente o custo mensal.
- Δ absoluto = cenário − atual.
- Δ relativo = Δ absoluto ÷ |atual| × 100, indefinido quando atual = 0.
- Arredondamento monetário a centavos; preço do cenário arredondado antes do cálculo da receita.

O contrato `FinancialRule` em `packages/financial-engine/index.ts` permite substituir as fórmulas por implementação tipada, com versão, indicação oficial e memória de cálculo. Não usa `eval` nem executa fórmulas recebidas do navegador. Quando as fórmulas forem fornecidas, substituir o adaptador e ajustar os rótulos de status; não basta mudar `official` para true.

## Dados e inferências

Limites: 10 MB, 50.000 linhas e 100 colunas. XLSX importa a primeira planilha, rejeita células com fórmulas e limita a expansão do ZIP a 40 MB. XML rejeita DTD e entidades externas. CSV exige cabeçalhos. Datas ISO são aceitas em ambos os formatos regionais. Quantidades positivas e preços não negativos são obrigatórios. IDs são normalizados com NFKC e espaços externos removidos, preservando maiúsculas/minúsculas e zeros à esquerda.

Duplicata é a repetição exata de cliente/pedido/data/produto/quantidade/preço. Se o arquivo contiver linhas legitimamente idênticas, consolide-as na origem. Não se infere que IDs distintos correspondem à mesma pessoa.

Recência é calculada em relação à última data da base. Segmentos usam prioridade explícita: inatividade, diversidade de categorias, ticket alto, recorrência e faixa habitual. Uma base homogênea pode ter menos segmentos; o sistema não força grupos artificiais para atingir cinco. Não deriva demografia ou personalidade.

Motor `heuristic-evidence-v1`: pontuação base 0,50; categoria observada +0,20; preço dentro da faixa observada +0,15; preço acima de 1,5× do máximo observado −0,35; pelo menos três pedidos +0,10; inatividade superior a 90 dias −0,25. Aceita a partir de 0,70; rejeita até 0,35; demais indecisos. Sem categoria ou faixa válida, indeciso. Essas regras são premissas exploratórias, **não probabilidades calibradas**. Custo não altera aceitação quando o preço ao consumidor é mantido.

## Persistência, segurança e operação

- Supabase PostgreSQL acessado por `@supabase/supabase-js` exclusivamente no servidor. Banco embutido, drivers de conexão direta e fallback local foram removidos. A estrutura é criada pela migration versionada, não durante requisições.
- Tabela `public.simula_records` com RLS habilitada e sem permissões para `anon`/`authenticated`. Somente o backend usa a chave secret/service role; a autorização e o filtro por workspace continuam obrigatórios em todas as operações. A chave administrativa ultrapassa RLS, portanto nunca é entregue ao navegador.
- Listagem paginada por cursor evita truncamento no limite da API do Supabase. Falhas de configuração, migration e conectividade são apresentadas como indisponibilidade, nunca como uma lista vazia.
- Registros JSON tipados por domínio, indexados por workspace, tipo e ID. Dados de decisões/eventos são gravados por lote. Eventos só são produzidos após leitura de confirmação das decisões persistidas.
- Conteúdo dos registros criptografado com AES-256-GCM antes do envio ao Supabase. `SIMULA_ENCRYPTION_KEY` é obrigatória e não é gerada nem lida de arquivo pelo aplicativo. Guarde-a em secret manager separado do banco e preserve-a em backups; perdê-la torna os registros ilegíveis.
- Cookie de sessão aleatório de 256 bits, HttpOnly, SameSite=Strict, Secure em HTTPS. Cada sessão é proprietária de um workspace isolado. Consultas e exports exigem essa sessão. Não há recuperação de cookie, convite de membros ou colaboração com múltiplos papéis nesta versão.
- Identificadores pessoais de cliente e pedido são substituídos por HMAC específico do workspace. Colunas não mapeadas são descartadas após a confirmação. A prévia bruta é criptografada, expira em uma hora e é removida na próxima consulta de estado/importação ou confirmação.
- Jobs executam no processo Node com `after`, checkpoint de lote e polling. O retorno ao status da execução retoma jobs interrompidos; falhas parciais têm ação explícita de retomada. Reexecução usa a mesma versão/seed e não duplica decisões. Não é uma fila distribuída: execute **uma réplica** do servidor no MVP.
- A exclusão do workspace é bloqueada enquanto seu worker está ativo, evitando recriação acidental de registros. Os registros são removidos do banco ativo; backups e retenção devem ser administrados pelo operador.
- Acesso sem login ou senha: basta nomear e abrir o laboratório. O cookie anônimo mantém os dados isolados por workspace neste navegador. Para disponibilização externa, configure as credenciais do Supabase, `SIMULA_ENCRYPTION_KEY` e HTTPS.

## IA e voz na nova oferta

Configure `OPENAI_API_KEY` em `apps/web/.env.local` e reinicie o servidor. A conversa usa **GPT-4o-mini**, sem alteração automática do modelo. A transcrição usa `OFFER_TRANSCRIPTION_MODEL` (default `gpt-4o-mini-transcribe`) e é independente do modelo de conversa.

Roteiro: ideia/problema/público → proposta → preço → revisão. O chat aproveita respostas anteriores e evita prolongar a conversa por custo ou público desconhecidos. A ficha pode ser corrigida diretamente; cada edição remove o aceite anterior. Confirmação cria uma oferta revisada e abre a configuração da simulação.

Conversa e rascunho ficam criptografados no Supabase, isolados por workspace. Edite a ficha e envie uma mensagem ou confirme para persistir ajustes manuais. Nova conversa substitui o rascunho, sem apagar ofertas confirmadas. Áudio não é armazenado pela aplicação: é enviado à OpenAI para transcrição, apresentada ao usuário antes de enviar ao chat. Não inclua PII; históricos de clientes não são enviados.

Limites: 60 s por gravação na interface, 8 MB por áudio, 4.000 caracteres por mensagem, 20 interações por conversa, 60 chamadas/hora/workspace e timeout de 30 s. Falhas preservam o texto para nova tentativa. Sem microfone, digite; sem chave, use a ficha manual. Execute uma réplica do servidor.

O endpoint legado `offer/interpret` permanece compatível com `OFFER_AI_URL`, `OFFER_AI_KEY` e `OFFER_AI_MODEL`; ele não alimenta o novo chat. Credenciais nunca são entregues ao navegador.

Referências: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4o-mini](https://developers.openai.com/api/docs/models/gpt-4o-mini) e [transcrição](https://developers.openai.com/api/docs/guides/speech-to-text).

## Organização

```text
apps/web/app/                   aplicação Next.js e API
apps/web/components/            formulários, dashboards e inspector
apps/web/components/lab-3d/     cena original e estado de reprodução
apps/web/lib/                   cliente Supabase, persistência, criptografia e dados fictícios
supabase/migrations/            estrutura PostgreSQL e políticas de acesso
packages/contracts/            contratos de domínio
packages/financial-engine/     cálculo independente e adaptador de fórmulas
packages/ingestion/             parsers, validação e pseudonimização
packages/profiling/             RFM e segmentação
packages/offer-understanding/   interpretação e contrato do provedor
packages/simulation-core/      decisão determinística e eventos
services/workers/              lotes, checkpoints e retomada
```

Rotas: `/`, `/financials`, `/data/import`, `/customers`, `/offers/new`, `/simulations/new`, `/simulations/[id]/lab`, `/simulations/[id]/results`, `/simulations/[id]/financials`, `/settings/privacy`. O roteador catch-all mantém essas URLs usando componentes pequenos por fluxo.

## Decisões de escopo

O conflito na ordem de execução dos documentos foi resolvido priorizando o financeiro, conforme `agents.md` e a entrega central do desafio 15. A ausência das fórmulas oficiais é mantida visível. O 3D utiliza primitivas originais, sem assets, marca ou personagens do Habbo. Não há campanhas, pagamentos ou contato com compradores.

Permanecem dependências externas para a demonstração integral: as fórmulas fornecidas pela organização e um provedor de IA configurado. Com o Supabase configurado, a aplicação funciona sem fórmulas oficiais e sem IA externa, com esses limites apresentados explicitamente ao usuário. Supabase Auth, Storage e Realtime não são necessários para esta migração: a sessão proprietária existente continua autorizando os requests, uploads são normalizados pelo servidor e o replay continua usando polling.

A migração de infraestrutura substitui a recomendação genérica PostgreSQL/Drizzle dos documentos originais pela instrução posterior do usuário: Supabase exclusivo. Dados de instalações locais anteriores não são copiados automaticamente para o serviço remoto.

## Piloto de agentes interativos (opcional)

O modo atual continua usando `heuristic-evidence-v1`. A retomada agora recusa motores incompatíveis antes de modificar decisões/checkpoints. Simulações concluídas continuam disponíveis.

Para o piloto, configure `SIMULA_AGENT_MODE=true` em `apps/web/.env.local` e reinicie o servidor. Abra `/agents` em um workspace de teste e prepare o lote: três perfis hipotéticos × duas variantes de uma agenda fictícia. Não há pagamentos, mensagens nem conexão com agendas reais.

Instale o navegador com `npx playwright install chromium`. O executor roda separadamente, a partir da raiz do repositório. Ele usa `OFFER_AI_URL`, `OFFER_AI_KEY` e `OFFER_AI_MODEL` do provedor compatível já descrito acima; o provedor precisa retornar `usage.total_tokens`. Forneça `SIMULA_SESSION` no ambiente do processo com o cookie da sessão de teste (não coloque esse segredo em comandos compartilhados ou commits). Se necessário, defina `SIMULA_BASE_URL` para a porta local utilizada.

```sh
node --env-file=apps/web/.env.local --import tsx services/agents/run.ts
```

Execute somente um executor por servidor neste piloto. Cada episódio usa um navegador isolado, até 20 ações, 120 segundos e teto de 12.000 tokens com reserva conservadora antes de chamadas. A página mostra consumo em tokens; valor monetário depende da tarifa do modelo. As capturas ficam em `.simula/agents/` na máquina do executor, e não em URLs públicas. O avaliador verifica o estado final; relatos de conclusão não bastam.

Cancelar na página encerra novos passos e preserva o registro. Desativar o modo impede novos trabalhos e é observado pelos executores entre ações; uma ação em andamento pode terminar antes do cancelamento. Registros permanecem legíveis. Após queda do executor, cancele tentativas interrompidas e prepare outro lote: este piloto não retoma contextos de navegador perdidos. Não apague um workspace durante trabalho ativo.

Validação local:

```sh
npm test
npm run typecheck
npm run build
# Com o servidor em localhost:3007:
npx tsx tests/ui-smoke.ts
```

Os testes de navegador usam ações controladas e são distintos de execuções com IA externa. As verificações de isolamento/persistência em memória não comprovam conectividade com Supabase. Consulte `VALIDATION.md` para os resultados efetivamente obtidos e pendências. O fluxo npm foi validado; a instalação Yarn ainda precisa ser verificada.

Smoke opcional contra o Supabase configurado (cria dados em workspaces novos): com o servidor de teste em `127.0.0.1:3007`, modo de agentes habilitado e configuração de criptografia correspondente, execute `node --env-file=.simula/test.env --conditions=react-server --import tsx tests/live-smoke.ts`. Para conferir persistência após reinício, reinicie o servidor com o modo desativado e execute `npx tsx tests/live-ui.ts`. Esses scripts não fazem parte de `npm test`; dependem de configuração explícita, guardam uma sessão de teste local e não devem ser apontados para sessões de usuários existentes.
