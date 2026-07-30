# 0005 — OpenRouter como conector de modelos de IA

## Status

Aceita — 2026-07-30. Substitui a ADR 0004 (OmniRoute self-hosted).

## Contexto

A ADR 0004 escolheu o OmniRoute auto-hospedado como gateway de modelos, rejeitando o OpenRouter por ser um SaaS intermediário na cadeia de dados. A decisão fazia sentido no papel, mas o custo que ela cobra é operacional e recorrente: mais um serviço na VPS para instalar, atualizar, monitorar e manter de pé — para um app single-user, operado por uma pessoa, cujo volume de chamadas de IA é baixo.

O ganho que justificava esse custo era "sem terceiro na cadeia de dados sensíveis". Num app pessoal, onde operador e usuário são a mesma pessoa e o consentimento é auto-consentimento, esse ganho é menor do que parecia: o dado sensível já trafega para um provedor de modelo de terceiros de qualquer forma. O OpenRouter acrescenta um intermediário, não o primeiro terceiro.

A ADR 0003 já fixa `@ai-sdk/openai-compatible` do Vercel AI SDK como a abstração. O OpenRouter expõe endpoint OpenAI-compatível, então a troca é de configuração, não de arquitetura.

## Decisão

O app conecta-se ao OpenRouter via `@ai-sdk/openai-compatible`, configurado por `OPENROUTER_BASE_URL` e `OPENROUTER_API_KEY`. A chave existe apenas no servidor (Route Handlers e worker); nunca é embutida no bundle da PWA.

O que muda em relação à ADR 0004:

- **O mapa de nomes lógicos volta para o app.** O OmniRoute oferecia um dashboard que traduzia `refeicao-foto` → provedor+modelo concreto. O OpenRouter não tem essa camada, então o mapeamento vira código versionado em `src/lib/ia/`. Isso é uma troca aceitável: perde-se trocar modelo sem deploy, ganha-se o mapeamento sob revisão de código e no histórico do git.
- **Roteamento fixo, sem fallback silencioso.** Toda chamada envia `provider: { allow_fallbacks: false }` e ordem de provedor explícita. Sem isso, o OpenRouter pode servir a requisição por um provedor diferente do consentido, o que quebraria o requisito de consentimento da spec. Fallback automático é proibido nas operações que enviam dado sensível.
- **O consentimento cita a cadeia inteira.** O texto por operação informa OpenRouter como intermediário *e* o provedor final. Omitir o intermediário tornaria o consentimento falso.

O que permanece inalterado da ADR 0004:

1. **Auditoria pelo resultado real** — a Trilha de Decisão registra o modelo/provedor efetivamente usado, lido do campo `model` da resposta, não o nome lógico. Resposta que não identifique o modelo resolvido é tratada como não auditável e degrada com segurança.
2. **Degradação segura** — indisponibilidade ou saída inválida segue as regras gerais da spec: fallback determinístico, nunca simulação.
3. **Testes por contrato** — provider falso, como a spec já exige; o app continua cego para o catálogo real.

## Consequências

- Nenhum serviço extra na VPS. Some o trabalho de operar, atualizar e monitorar o gateway — que era o custo real da ADR 0004.
- Existe um terceiro a mais na cadeia de dados sensíveis. Mitigado por roteamento fixo e consentimento explícito, mas é uma perda genuína de privacidade em relação à decisão anterior, aceita conscientemente pelo perfil single-user.
- Trocar de modelo agora exige deploy, não mais configuração em dashboard.
- Custo vira pós-pago por token no OpenRouter, com créditos e teto de gasto configuráveis na conta — em vez do custo fixo de rodar um serviço.
- Custo de saída continua baixo: qualquer endpoint OpenAI-compatível (inclusive voltar ao OmniRoute) é uma troca de base URL.
- Ponto de revisita: se o app deixar de ser single-user, o argumento de privacidade da ADR 0004 volta a valer e esta decisão deve ser reavaliada.
