# 0004 — OmniRoute self-hosted como conector de modelos de IA

## Status

Aceita — 2026-02-10

## Contexto

A spec fixa o Vercel AI SDK como abstração de modelos, com requisitos fortes: consentimento por operação informando dado, finalidade, **provedor** e retenção; registro de modelo/versão por decisão na Trilha de Decisão; degradação segura em falha. Alternativas avaliadas: providers diretos do AI SDK (`@ai-sdk/anthropic` etc.), Vercel AI Gateway (SaaS, sem BYOK, roteamento opaco) e OpenRouter (SaaS intermediário). Escolhido o **OmniRoute** — gateway open-source (MIT) **auto-hospedado** na infra do próprio operador, com endpoint OpenAI-compatível, gestão de chaves e dashboard de custo.

## Decisão

O app conecta-se exclusivamente ao endpoint OmniRoute via `@ai-sdk/openai-compatible` do Vercel AI SDK. A divisão de responsabilidade é:

- **App**: conhece apenas o endpoint e nomes lógicos de modelo por operação (ex.: `refeicao-foto`, `importacao-historico`, `copiloto`). Não gerencia chaves de provedores nem catálogo de modelos.
- **OmniRoute (operação)**: mapeia cada nome lógico para provedor+modelo concretos, guarda as chaves e decide o catálogo disponível.

A conexão é configurada por variáveis de ambiente do servidor — `OMNIROUTE_BASE_URL` (endpoint HTTPS do gateway, ex.: `https://<host>/v1`) e `OMNIROUTE_API_KEY` (chave do dashboard do OmniRoute). A chave existe apenas no servidor (Route Handlers e worker); nunca é embutida no bundle da PWA nem exposta ao cliente. Valores reais vivem no ambiente do deploy (Dockploy), não no repositório.

Requisitos que permanecem do lado do app, independentes do gateway:

1. **Auditoria pelo resultado real** — o app registra na Trilha de Decisão o modelo/provedor efetivamente usado, extraído dos metadados de cada resposta (não o nome lógico). Se a resposta não identificar o modelo resolvido, a chamada é tratada como não auditável e degrada com segurança.
2. **Consentimento coerente com a configuração** — o texto de consentimento apresenta o provedor final. Como o mapeamento vive no OmniRoute, manter os textos coerentes com a configuração do gateway é responsabilidade operacional; num app single-user, operador e usuário são a mesma pessoa.
3. **Degradação segura** — indisponibilidade ou saída inválida do gateway segue as regras gerais da spec (fallback determinístico, nunca simulação).

Para as operações que enviam dado sensível, a configuração do gateway não deve usar roteamento que troque de provedor silenciosamente nem compressão de prompt — a entrada auditada deve ser a entrada enviada. Essa é uma regra de configuração, não de código.

## Consequências

- Sem terceiro na cadeia de dados sensíveis: o gateway roda na infra própria; dados vão direto ao provedor final consentido.
- Trocar/adicionar modelos é operação de configuração no OmniRoute, sem alterar código do app — alinhado com "modelos substituíveis" da spec.
- O app fica cego para o catálogo: os testes usam provider falso por contrato (como a spec já pede) e a auditoria depende dos metadados de resposta.
- Mais um serviço na VPS para operar, atualizar e monitorar (o monitoramento externo da spec deve cobri-lo).
- Se o OmniRoute for descontinuado, a saída é trocar o base URL por outro endpoint OpenAI-compatível ou pelos providers diretos do AI SDK — custo de saída baixo.
