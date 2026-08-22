---
type: Development Learning
title: "History API com objeto URL quebra o cache da PWA em silêncio"
description: "O SerwistProvider serializa o 3º argumento de pushState/replaceState por structured clone; passe string, porque um URL lança DataCloneError e derruba o cache de navegação."
tags: [pwa, service-worker, serwist, history-api, nextjs, diagnostico]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-22T17:45:00-03:00
sources:
  - id: pr-138
    resource: https://github.com/IgorGuariroba/athlyt/pull/138
    title: "PR #138 — navegação por swipe e proteção da main"
  - id: navegador-exercicios
    resource: "src/app/(app)/sessao/[id]/navegador-exercicios.tsx"
    title: "Carrossel de exercícios que sincroniza o índice na URL"
  - id: serwist-provider
    resource: node_modules/@serwist/next/dist/index.react.mjs
    title: "SerwistProvider monkey-patcha history.pushState/replaceState"
---

# Contexto

O carrossel de exercícios sincroniza o exercício visível com a query string
usando `history.replaceState`. A chamada passava o objeto `URL` montado logo
acima, que é o uso natural da API — o 3º argumento aceita `string | URL`.[^navegador-exercicios]

No E2E, a tela navegava sozinha para `/mais` no meio da sessão e o teste
falhava longe da causa. O trace do Playwright continha sete `pageError` com
`Failed to execute 'postMessage' on 'ServiceWorker': URL object could not be
cloned`.[^pr-138]

# Aprendizado

`SerwistProvider` (com `cacheOnNavigation`) substitui `history.pushState` e
`history.replaceState` para pré-cachear a rota destino, e repassa o **terceiro
argumento** para `messageSW`.[^serwist-provider] Essa mensagem atravessa
`postMessage`, que serializa por structured clone — e `URL` **não** é
clonável. O resultado é `DataCloneError` a cada troca de rota.

Três propriedades tornam isso caro de achar:

- A navegação em si funciona: `replaceState` já executou quando o patch falha.
  Só o pré-cache morre, então a quebra é invisível no happy path e aparece
  como falha offline depois.
- O erro é assíncrono e não rejeita a chamada do componente; nada no código do
  produto aparece no stack.
- O sintoma observado (navegação espontânea) não tem relação aparente com a
  causa (serialização de mensagem para o service worker).

A regra prática: com um service worker que instrumenta a History API, o 3º
argumento de `pushState`/`replaceState` deve ser **string**.

# Aplicação futura

Ao sincronizar estado de UI com a URL sem recarregar a rota, monte o `URL`
para calcular e passe a string:

```ts
const url = new URL(window.location.href);
url.searchParams.set("exercicio", String(indice));
window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
```

Vale para qualquer valor não clonável cruzando `postMessage` (`URL`,
`Element`, `Function`, `Proxy`, classe com método).

Quando um E2E navegar sozinho ou falhar longe do ponto de origem, **leia os
`pageError` do trace antes de mexer no seletor**:

```bash
unzip -o -q test-results/<cenário>/trace.zip -d /tmp/tr
python3 -c "
import json
for l in open('/tmp/tr/0-trace.trace'):
    e=json.loads(l)
    if e.get('method')=='pageError':
        print(e['params']['error']['error']['message'][:200])
"
```

Erro repetido em console é causa candidata; ajustar o teste em cima disso
esconde defeito de produção.

# Evidência

Isolado fora do app: `postMessage` com `{ urlsToCache: [new URL(...)] }` lança
`DOMException: URL object could not be cloned`, e com a string equivalente
serializa normalmente.[^pr-138]

Trocar o objeto pela string eliminou os sete `pageError` e fez
`e2e/navbar-visivel.e2e.test.ts` passar; a suíte foi de 9 falhas para 1 — a
restante é `sessao.e2e.test.ts:222`, que depende de R2 ausente no CI e falha
igual na branch sem estas mudanças.[^pr-138]

[^pr-138]: Consulte `sources` com id `pr-138`.
[^navegador-exercicios]: Consulte `sources` com id `navegador-exercicios`.
[^serwist-provider]: Consulte `sources` com id `serwist-provider`.
