# Validação da implementação — 23/10/2026

Base: `7ebd6a8`; branch `codex/interactive-agent-pilot`. Checkout isolado nesta pasta. Nenhum deploy ou dado de produção foi alterado.

| Entrega | Evidência obtida | Limite |
|---|---|---|
| 1 — regressão | Testes de financeiro, CSV/XLSX/XML, perfis, oferta e decisões/replay; typecheck/build da base passaram | Persistência e ciclo completo do produto em Supabase não executados |
| 2 — versão | Motores incompatíveis e sem versão não alteram registros; concluídos antigos preservados; execução compatível completa em armazenamento controlado | Retomada contra banco real pendente |
| 3 — modo opcional | Desligado por padrão; criação bloqueada; seis registros separados; outro workspace não acessa uma execução; cancelamento e leitura após desligamento testados | Store em memória nos testes; schema Supabase existente reutilizado, sem migrations |
| 4 — executor | Seis episódios reais de Chromium com ações controladas; confirmação duplicada mantém uma reserva; falso sucesso, cancelamento, timeout, limites de ações/tokens testados | Não são seis episódios com LLM: provedor não configurado |
| 5 — interface | Seis rotas renderizadas no navegador com dados simulados, sem pageerror; opção de execução ausente com modo desligado; API real retorna 401 sem sessão | Não comprova fluxos completos autenticados; screenshot inspecionada |

`npm test`: 12 testes passaram, incluindo seis episódios A/B no navegador dentro de um dos testes. `npm run typecheck` e `npm run build`: passaram. Smoke da interface foi executado com servidor isolado em 127.0.0.1:3007, preservando outro processo já existente na porta 3000.

Pendências para aceite integral: configurar Supabase e chave de criptografia no checkout de teste, executar smoke autenticado e persistência/recarga/retomada/isolamento no banco; configurar provedor de IA e executar o lote de seis episódios metered. Nenhuma credencial foi encontrada no ambiente/checkout e nenhuma foi inventada ou copiada de outro projeto. Instalação Yarn não executada; npm é o caminho reproduzido neste trabalho.

O piloto mede conclusão técnica em uma fixture fictícia. Não foi validado com consumidores reais e não estima conversão humana. Capturas de teste ficam em `.simula/` e são ignoradas pelo Git.
