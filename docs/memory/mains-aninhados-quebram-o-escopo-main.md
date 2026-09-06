---
type: Development Learning
title: "Dois mains aninhados quebram o escopo por getByRole('main')"
description: "O landmark main pertence à rota, não à moldura: o casco (app) é o único main nas rotas do grupo, o TelaConteudo é um div, e rotas fora do casco envolvem a moldura no próprio main. Corrigido na issue #200."
tags: [e2e, playwright, layout, acessibilidade, diagnostico]
status: stable
generated:
  by: agente/pi (gpt-6-astra)
  at: 2026-09-06T20:35:00-03:00
updated:
  by: agente/pi (gpt-6-astra)
  at: 2026-09-06T00:00:00-03:00
sources:
  - id: layout-app
    resource: src/app/(app)/layout.tsx
    title: "casco do (app) renderiza o único <main> rolável das rotas do grupo"
  - id: tela-conteudo
    resource: src/components/tela/tela-conteudo.tsx
    title: "TelaConteudo é um div de largura máxima; o landmark vem de quem envolve"
  - id: caso-197
    resource: e2e/revisao-corporal.e2e.test.ts
    title: "strict mode violation em getByRole('main') na página de proposta da Revisão"
  - id: caso-200
    resource: "https://github.com/IgorGuariroba/athlyt/issues/200"
    title: "issue que fixou a posse do landmark"
---

# Contexto

Na issue #197, o teste E2E da página `/progresso/revisao/proposta` reprovou com
`strict mode violation: getByRole('main') resolved to 2 elements` ao usar o
remédio padrão da memória `route-announcer-do-next-e-um-alert.md` (escopar a
asserção a `getByRole("main")` para fugir do announcer). O casco do grupo
`(app)` e o componente `TelaConteudo` renderizavam cada um um `<main>`,
aninhados; o locator resolvia nos dois e o strict mode recusava.

# Aprendizado

**O landmark `main` pertence à rota, não à moldura de conteúdo.** A issue #200
consolidou a posse no casco — o único elemento presente em todas as rotas do
grupo `(app)`, incluindo as que não usam `TelaConteudo` — e o `TelaConteudo`
virou um `<div>`. Rotas fora do casco que usam a moldura
(`(auth)/plano/revisao*`, `(auth)/triagem/resumo`, `(auth)/error.tsx`,
`acesso-restrito`) não têm layout com `main`, então envolvem o `TelaConteudo`
no próprio `<main className="flex flex-1 flex-col">`.

Com um único `main` por página, o escopo por `getByRole("main")` voltou a ser o
padrão seguro contra o announcer do Next em todas as rotas. HTML permite um
único `main` visível por página: duplicado e aninhado, o atalho "pular para o
conteúdo" do leitor de tela perde o sentido; ausente (moldura sem casco e sem
wrapper), a rota fica sem atalho.

O guard unitário em `src/components/tela/__tests__/tela.unit.test.tsx` trava a
decisão: `TelaConteudo` não renderiza `main`.

# Aplicação futura

- Ao escopar asserções de texto contra o announcer, use `getByRole("main")`
  direto; não há mais aninhamento a contornar.
- Se um locator reprovar com "resolved to 2 elements" e um deles for o casco
  `tabindex="0"`, trate como regressão de landmark aninhado, não como
  duplicação de conteúdo.
- Ao criar tela fora do casco `(app)` com `TelaConteudo`, é a página quem
  fornece o `<main>` — moldura nunca é landmark.

# Evidência

`e2e/revisao-corporal.e2e.test.ts` reprovou com os dois mains na issue #197;
o contorno da época (`getByRole("listitem").filter({ hasText: "Justificativa" })`)
foi simplificado de volta ao escopo por `main` na correção da issue #200.

[^1]: sources: caso-197
[^2]: sources: layout-app
[^3]: sources: tela-conteudo
[^4]: sources: caso-200
