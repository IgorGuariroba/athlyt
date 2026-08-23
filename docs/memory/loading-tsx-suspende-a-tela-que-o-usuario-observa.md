---
type: Development Learning
title: "`loading.tsx` cobre o segmento inteiro e atrapalha a tela que o usuário observa mudar"
description: "Em segmento sem page.tsx, loading.tsx vira fronteira de Suspense de todas as rotas filhas; e em tela cuja atualização é observada in-place, o esqueleto reexibe conteúdo anterior a cada revalidação."
tags: [nextjs, app-router, suspense, loading, server-actions, e2e]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-23T18:15:00-03:00
sources:
  - id: pr-142
    resource: "PR #142 — estados de carregamento e erro por segmento"
    title: "4 testes E2E quebrados por dois usos indevidos de loading.tsx"
  - id: doc-loading
    resource: "https://nextjs.org/docs/app/api-reference/file-conventions/loading"
    title: "Next.js — loading.js envolve page.js 'and any children below'"
---

# Contexto

Ao adicionar estados de carregamento às rotas com I/O, seis `loading.tsx` passaram no build, no lint, em 462 testes de unidade e em 139 stories — e quebraram 4 cenários E2E, os únicos que navegam de verdade.

Dois usos estavam errados, por razões diferentes.

# Aprendizado

**1. Segmento sem `page.tsx` não é rota, e `loading.tsx` ali captura as filhas.**
`/sessao` só agrupa `[id]`, `historico` e `previa`. Um `loading.tsx` no segmento não cria carregamento "da aba": vira a fronteira de Suspense de tudo abaixo, porque a convenção envolve `page.js` *"and any children below"*.[^doc-loading] A prévia ficou com `<main>` vazio até o timeout de 30 s. Antes de criar o arquivo, confirme que existe `page.tsx` no mesmo diretório.

**2. O critério não é "a action revalida a própria rota" — é se o usuário fica na tela esperando.**
Foi a hipótese errada que sobreviveu mais tempo. O diário revalida a si mesmo e quebrou; `/progresso` também revalida a si mesmo e passou. A diferença: no diário o atleta **clica e espera a mesma tela mudar**; em progresso a atualização é vista após navegação (`goto`). Numa navegação o esqueleto é exatamente o desejado; numa atualização in-place ele reexibe o estado anterior, e o usuário vê a tela "voltar" antes de avançar.

# Aplicação futura

Antes de adicionar `loading.tsx`, responda duas perguntas:

1. Existe `page.tsx` neste diretório? Se não, o arquivo pertence à folha, não ao segmento.
2. A tela é atualizada in-place por uma ação do usuário? Se sim, o esqueleto cobra o preço de re-suspender a cada ação em troca de um ganho que só aparece na primeira visita.

Sobra o caso bom: rota alcançada por navegação, que lê dados e não é o alvo de uma action que a revalide sob os olhos do usuário — `progresso`, `progresso/fotos`, `sessao/historico`.

# Evidência

O E2E foi o único sinal: build, lint, unidade e stories passaram nos dois erros.[^pr-142] Corrigido o `/sessao`, o CI caiu de 4 falhas para 1; removido o esqueleto do diário, ficou verde. O `error-context.md` do artefato do CI é o que diagnostica — mostra a árvore acessível renderizada, e nele o `<main>` vazio e o botão "Comi como planejado" já clicado com a lista inalterada.

[^doc-loading]: "In the component hierarchy, loading.js wraps not-found.js, page.js, and any children below in a `<Suspense>` boundary."
[^pr-142]: PR #142, commits `923a065` (move para a folha) e `58ea0b6` (remove do diário).
