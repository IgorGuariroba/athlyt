---
type: Development Learning
title: "E2E local exige AUTH_URL apontando para o host de teste"
description: "Com o AUTH_URL do .env apontando para o Tailscale, o Auth.js emite cookie __Secure- e todo cenário E2E autenticado é redirecionado para a raiz."
tags: [e2e, autenticacao, playwright, nextauth, ambiente]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-07-30T22:30:00-03:00
sources:
  - id: sessao-roleta-2026-07-30
    resource: "e2e/helpers/seed-session.ts, src/proxy.ts, .env (AUTH_URL)"
    title: "Investigação da falha de autenticação ao validar as réguas de altura e peso"
---

# Contexto

O `.env` do projeto tem `AUTH_URL` apontando para a URL pública do Tailscale Funnel, porque é assim que a aplicação é usada. Ao rodar `npx playwright test` contra `localhost`, os cenários autenticados falhavam logo na primeira asserção, com a página redirecionada para a raiz — sintoma que se parece com regressão de UI, mas não é.[^sessao-roleta-2026-07-30]

# Aprendizado

`AUTH_URL` com esquema `https` faz o Auth.js emitir e exigir o cookie de sessão com prefixo `__Secure-`. O helper `seedAuthenticatedSession` grava `authjs.session-token` sem prefixo (correto para HTTP), então a sessão nunca é reconhecida, o `proxy.ts` trata a requisição como anônima e redireciona para `/`.

A falha não vem do código sob teste. Diagnosticar isso pela mensagem do Playwright leva a perseguir o componente errado; o sinal decisivo é o `location:` do redirect apontar para o host do Tailscale em vez de `localhost`.

# Aplicação futura

A suíte Playwright já não exige esse cuidado: o `webServer` de `playwright.config.ts` sobe o servidor com `AUTH_URL` derivado do `baseURL`, então `PLAYWRIGHT_BASE_URL=http://localhost:3100` leva a autenticação junto. Antes disso, os cenários de `e2e/acesso` falhavam com `chrome-error://chromewebdata/` em qualquer porta diferente da 3000 — o `AUTH_URL` do `.env` apontava para a 3000 enquanto o teste observava a 3100.

Fora do Playwright, ao subir um servidor à mão para E2E autenticado, mantenha `AUTH_URL` casando o host e a porta que o teste acessa:

```bash
AUTH_URL=http://localhost:3100 npx next dev -p 3100
```

Antes de suspeitar do componente, confirme a origem da falha com uma requisição direta:

```bash
curl -s -I http://localhost:3100/triagem/altura -H "Cookie: authjs.session-token=<token>" | head -2
```

`200` isola o problema na UI; `307` para um host que não é o testado indica descasamento de `AUTH_URL`.

Use também uma porta dedicada quando outro processo puder estar usando a 3000: o `next dev` detecta uma instância já ativa no mesmo diretório e encerra com "Another next dev server is already running" em vez de subir na porta pedida.

# Evidência

Com `AUTH_URL` do `.env`, `/triagem/altura` respondia `307` para `https://…ts.net/` mesmo com cookie de sessão válido. Subindo o servidor com `AUTH_URL=http://localhost:3100`, a mesma requisição passou a responder `200` e a jornada autenticada completou altura e peso sem alteração no código da aplicação.[^sessao-roleta-2026-07-30]

[^sessao-roleta-2026-07-30]: Consulte `sources` com id `sessao-roleta-2026-07-30`.
