---
type: Development Learning
title: "Dois mains aninhados quebram o escopo por getByRole('main')"
description: "Nas rotas do casco (app), o layout e o TelaConteudo renderizam cada um um <main>, e getByRole('main') resolve em dois elementos, violando o strict mode do Playwright."
tags: [e2e, playwright, layout, acessibilidade, diagnostico]
status: stable
generated:
  by: agente/pi (gpt-6-astra)
  at: 2026-09-06T20:35:00-03:00
sources:
  - id: layout-app
    resource: src/app/(app)/layout.tsx
    title: "casco do (app) renderiza um <main> rolável"
  - id: tela-conteudo
    resource: src/components/tela/tela-conteudo.tsx
    title: "TelaConteudo renderiza um <main> interno de largura máxima"
  - id: caso-197
    resource: e2e/revisao-corporal.e2e.test.ts
    title: "strict mode violation em getByRole('main') na página de proposta da Revisão"
---

# Contexto

Na issue #197, o teste E2E da página `/progresso/revisao/proposta` reprovou com
`strict mode violation: getByRole('main') resolved to 2 elements` ao usar o
remédio padrão da memória `route-announcer-do-next-e-um-alert.md` (escopar a
asserção a `getByRole("main")` para fugir do announcer). O casco do grupo
`(app)` e o componente `TelaConteudo` **renderizam cada um um `<main>`**,
aninhados; o locator resolve nos dois e o strict mode recusa.

# Aprendizado

O escopo por `getByRole("main")` só funciona onde há um único `main` por
página — o announcer exige escopo, mas o aninhamento invalida esse escopo em
específico. Asserções de texto nessas rotas devem mirar um contêiner menor e
nomeado (ex.: `getByRole("listitem").filter({ hasText: "Justificativa" })`,
ou uma `region` com nome acessível), nunca o `main` inteiro.

O aninhamento também é defeito de acessibilidade latente: o HTML permite um
único `main` visível por página; o fato de a suíte antiga nunca ter travado é
só porque nenhum teste resolveu `getByRole("main")` em asserção direta.

# Aplicação futura

Ao escrever E2E no grupo `(app)`, escopar asserções de texto a um elemento
folha com nome (listitem, region, heading) e não ao `main`; se um locator
reprovar com "resolved to 2 elements" e um deles for o casco `tabindex="0"`,
trate como aninhamento de landmark, não como duplicação de conteúdo.

# Evidência

`e2e/revisao-corporal.e2e.test.ts:56` falhou com os dois mains no erro[1];
a mudança para `getByRole("listitem").filter({ hasText: "Justificativa" })`
fechou o teste sem tocar na aplicação. Os dois elementos vêm de `layout.tsx`
e `tela-conteudo.tsx`[2][3].

[^1]: sources: caso-197
[^2]: sources: layout-app
[^3]: sources: tela-conteudo
