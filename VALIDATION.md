# Validação da implementação — 23/10/2026

Base: `7ebd6a8`; branch `codex/interactive-agent-pilot`. Checkout isolado nesta pasta. Nenhum deploy foi realizado. A validação remota criou somente workspaces de teste novos; registros anteriores não foram modificados.

| Entrega | Evidência obtida | Limite |
|---|---|---|
| 1 — regressão | Financeiro, importação CSV/XLSX/XML, perfis, interpretação local/revisão da oferta, simulação e replay passaram também na API autenticada com Supabase real | Nenhum consumidor real participou |
| 2 — versão | Retomada de simulação concluída preserva totais; versão incompatível é recusada e o registro permanece idêntico no banco real | Ausência de versão coberta pelo teste controlado |
| 3 — modo opcional | Registros dos agentes persistidos; outro workspace não acessa execução; evento/releitura e cancelamento funcionam no banco; após reinício com modo desligado a criação retorna 403 e os registros continuam disponíveis | Apenas uma réplica e executor sequencial |
| 4 — executor | Seis episódios reais de Chromium com ações controladas; confirmação duplicada mantém uma reserva; falso sucesso, cancelamento, timeout e limites de ações/tokens testados | IA externa adiada pelo usuário; provedor ainda não configurado |
| 5 — interface | Smoke de seis rotas com dados simulados e cinco telas autenticadas com dados reais de teste; sem pageerror; resultados aparecem após reinício; API real retorna 401 sem sessão | Não comprova preferência ou conversão humana |

`npm test`: 12 testes passaram, incluindo seis episódios A/B controlados no navegador. `npm run typecheck` e `npm run build`: passaram na implementação. O smoke autenticado adicional (`tests/live-smoke.ts`) concluiu 14 verificações com Supabase real. `tests/live-ui.ts` verificou reinício, bloqueio de criação com o modo desativado e cinco telas autenticadas sem mocks. Os servidores de teste usaram 127.0.0.1:3007, preservando o processo existente na porta 3000.

O usuário indicou `/Users/danielmarigliano/Downloads/.env.local`. O arquivo tinha Supabase, não tinha IA e estava sem chave de criptografia. Seu conteúdo não foi exibido nem alterado. Uma configuração isolada foi criada em `.simula/test.env`, com chave aleatória exclusiva para os novos workspaces, permissões restritas e exclusão do Git. Essa chave foi preservada para permitir ler os registros de teste após reiniciar; não deve substituir chaves de instalações existentes. A sessão de teste está em `.simula/session`, também ignorada pelo Git. O segundo workspace usado para verificar isolamento foi excluído ao final.

O workspace principal de teste conserva as evidências e um lote preparado para a futura validação com IA. O modo ficou desativado na última verificação. Os arquivos de sessão e configuração são segredos locais e não devem ser compartilhados.

Pendência acordada: configurar provedor de IA posteriormente e executar os seis episódios com chamadas medidas. Instalação Yarn não executada; npm é o caminho reproduzido neste trabalho. O piloto não foi validado com consumidores reais e não estima conversão humana.

## Correção de finalização do executor — 23/10/2026

A inicialização do Chromium passou para o bloco de tratamento de erros, com limite de tempo e fechamento protegido. Falhas de inicialização agora retornam `executor_error` persistível. A medição de tokens é validada antes de alterar o acumulador, inclusive contra o limite do contrato de resultado; medições inválidas preservam o último total válido.

Foram acrescentados nove testes de regressão em `tests/executor-errors.test.ts`. Eles verificam falha de inicialização, medições negativas/fracionárias/não numéricas, valores excessivos e soma além do limite. Cada resultado é enviado ao handler real de `/result` com armazenamento controlado, que registra `failed` e permite preparar outro lote. Os oito primeiros casos reproduziram os defeitos antes da correção.

Revalidação: `npm test` passou com 21 testes; `npm run typecheck`, `npm run build` e `git diff --check` passaram. As 14 verificações autenticadas no Supabase foram repetidas com sucesso. Uma prova adicional com cinco falhas controladas do executor confirmou persistência no Supabase real, preservação dos totais válidos e liberação de outro lote; o workspace dessa prova foi excluído ao final. Os smokes de seis telas com dados simulados e cinco telas autenticadas também passaram após reinício com o modo desativado. Chamadas a IA externa continuam adiadas conforme combinado.

## Nova oferta por chat — 23/10/2026

Implementado GPT-4o-mini com saída estruturada, roteiro curto, ficha editável e revisão humana. Documentos de produto, desenvolvimento, agentes e README atualizados. Áudio é transcrito separadamente e apresentado para edição antes do envio.

Verificações realizadas nesta alteração:

- Chamadas reais ao GPT-4o-mini: descrição completa gerou ficha pronta; correção de preço preservou benefício e custo desconhecido; ideia vaga gerou pergunta de esclarecimento sem inventar preço.
- Transcrição real de áudio sintético em português pelo endpoint autenticado retornou o texto esperado. Isso valida a integração de transcrição, não a captura física do microfone.
- Supabase real: recarga, preservação do histórico em erro de IA, rejeição de ficha sem preço, confirmação idempotente, reset e revisão conflitante entre abas.
- API sem sessão recusada; arquivo com tipo inválido rejeitado. Dados temporários de validação removidos.
- Build e TypeScript verificados. Contrato da resposta inválida também exercitado com resposta controlada, sem nova suíte automatizada.

Limite: a inspeção visual e a permissão/captura do microfone no navegador não foram concluídas porque o controle do Chrome foi interrompido por uso simultâneo. A interface mantém digitação, mensagens de erro e liberação do microfone ao sair.
