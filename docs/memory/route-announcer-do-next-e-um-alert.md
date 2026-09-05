---
type: Development Learning
title: "O route announcer do Next é um `role=\"alert\"` global e polui `getByRole('alert')`"
description: "Depois de uma navegação, o Next injeta fora de `main` um `role=\"alert\"` com o texto do `h1`; asserções de \"nenhum erro na tela\" precisam ser escopadas ao `main`."
tags: [nextjs, playwright, e2e, acessibilidade, falso-positivo, diagnostico]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-09-05T12:35:00-03:00
sources:
  - id: fotos-r2-alert-2026-09-05
    resource: "node_modules/next/dist/client/components/app-router-announcer.js, e2e/fotos-r2.e2e.test.ts:102, test-results/fotos-r2.e2e-envia-as-quatro-poses-em-uma-única-interação-mobile-chrome/error-context.md"
    title: "\"envia as quatro poses em uma única interação\" reprovou com as quatro fotos enviadas com sucesso"
---

# Contexto

Na migração do build para Turbopack, `fotos-r2` reprovava em
`expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0)`
— a linha que afirma "nenhum erro na tela". O `error-context.md` mostrava
o envio concluído: URL de sucesso, `role="status"` com "Fotos
armazenadas", os quatro links assinados presentes. O único `alert` era:

```yaml
- alert [ref=e87]: Comparação visual padronizada
```

Texto do `h1` da própria página, não mensagem de erro. O comentário do
teste atribuía o ruído ao "overlay de dev do Next", mas a suíte roda
contra `next start`, onde não há overlay.

A origem é `AppRouterAnnouncer`: a cada navegação do App Router ele
injeta em `document.body` um `<next-route-announcer>` contendo um `div`
com `aria-live="assertive"` e `role="alert"`, e anuncia `document.title`
— ou, quando o documento não tem título, o texto do primeiro `h1`.

# Aprendizado

`getByRole("alert")` não é seletor exclusivo da aplicação: o Next mantém
um `alert` próprio, irmão de `main`, cujo conteúdo depende de a rota ter
título e de ter havido navegação anterior. Filtrar por texto não separa
um do outro — o announcer tem texto justamente quando anuncia.

O corte que funciona é estrutural, não textual: o alerta da aplicação
vive dentro do `main`; o announcer, fora. Escopar a asserção resolve sem
depender do texto que a página exibe.

```ts
await expect(
  page.getByRole("main").getByRole("alert").filter({ hasText: /\S/ }),
).toHaveCount(0);
```

Note o modo de falha: intermitente por construção. O announcer só fala
quando o título muda entre navegações, então o teste passa em quem chega
direto na rota e falha em quem chega por Server Action com redirect.

# Aplicação futura

Ao ver um E2E reprovar afirmando erro na tela enquanto o snapshot mostra
o fluxo concluído, leia o conteúdo do `alert` antes de suspeitar do
produto. Texto igual ao `h1` ou ao `<title>` identifica o announcer.

Toda asserção de ausência de alerta deve nascer escopada a um contêiner
da aplicação (`getByRole("main")` ou a região do formulário). O mesmo
vale para `role="status"` se o produto passar a usá-lo em múltiplos
lugares.

# Evidência

O anúncio vem do próprio Next:[^fotos-r2-alert-2026-09-05]

```js
// node_modules/next/dist/client/components/app-router-announcer.js
announcer.ariaLive = 'assertive';
announcer.role = 'alert';
...
if (document.title) { currentTitle = document.title; }
else { const pageHeader = document.querySelector('h1'); ... }
```

Com o locator escopado ao `main` e nenhuma alteração na aplicação, o
arquivo fechou 3/3 e a suíte completa, 50/50.
