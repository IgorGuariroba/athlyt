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

- **Dois catálogos de modelo, um por ambiente.** `IA_AMBIENTE=desenvolvimento` usa variantes `:free`; `producao` usa os modelos pagos. O código exercitado é idêntico nos dois — muda só o slug —, de forma que validar localmente passe pelo caminho real de rede, roteamento e parsing sem consumir crédito. Foi por isso que se descartou usar a assinatura ChatGPT via Codex em dev: o Codex expõe o loop de um agente de codificação (`app-server`/`mcp-server`), não um endpoint de modelo com saída estruturada, e a própria documentação da OpenAI direciona uso programático para API key. Modelos `:free` são fortemente limitados por taxa e podem sair do catálogo sem aviso — servem para validar integração, nunca para julgar qualidade de resposta.
- **O mapa de nomes lógicos volta para o app.** O OmniRoute oferecia um dashboard que traduzia `refeicao-foto` → provedor+modelo concreto. O OpenRouter não tem essa camada, então o mapeamento vira código versionado em `src/lib/ia/`. Isso é uma troca aceitável: perde-se trocar modelo sem deploy, ganha-se o mapeamento sob revisão de código e no histórico do git.
- **Roteamento fixo, sem fallback silencioso.** Toda chamada envia `provider: { allow_fallbacks: false, require_parameters: true }`. Sem `allow_fallbacks: false`, o OpenRouter pode servir a requisição por um provedor diferente do consentido, o que quebraria o requisito de consentimento da spec. `require_parameters: true` restringe o roteamento a endpoints que suportam os parâmetros enviados: o mesmo modelo é servido por vários provedores e nem todos honram `response_format`, de modo que sem ele uma requisição com JSON Schema pode cair num endpoint que devolve texto livre.
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
- Como os mocks não provam que `providerOptions` chega intacto ao gateway, `scripts/verificar-ia.ts` (`npm run ia:verificar`) faz uma chamada real e falha se o modelo resolvido divergir do solicitado ou se a resposta não identificar o modelo. É a única evidência de que o roteamento fixo funciona de fato.
- Custo de saída continua baixo: qualquer endpoint OpenAI-compatível (inclusive voltar ao OmniRoute) é uma troca de base URL.
- Ponto de revisita: se o app deixar de ser single-user, o argumento de privacidade da ADR 0004 volta a valer e esta decisão deve ser reavaliada.
