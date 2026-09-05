---
type: Development Learning
title: "Service Worker e `revalidatePath` da etapa errada servem estado velho depois da Server Action"
description: "O prefetch de RSC cacheado pelo `defaultCache` e o `revalidatePath` que aponta para uma rota diferente do `redirect` produzem o mesmo sintoma: a escrita grava no banco, o 303 sai, e a tela de destino ainda mostra o estado anterior."
tags: [nextjs, service-worker, serwist, pwa, cache, server-actions, rsc, e2e, diagnostico]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-29T13:25:00-03:00
sources:
  - id: ci-revisao-semanal-2026-08-29
    resource: "e2e/mudanca-objetivo.e2e.test.ts:59, e2e/revisao-corporal.e2e.test.ts:9, src/app/sw.ts, src/app/(app)/progresso/revisao/actions.ts"
    title: "E2E mobile reprovando de forma reprodutível na Revisão Semanal"
---

> **Nota de 2026-09-05.** O Serwist saiu do projeto na migração do build
> para Turbopack: `src/app/sw.ts` não existe mais e `public/sw.js` hoje só
> desregistra o worker antigo. A metade do Service Worker deste aprendizado
> vira histórico — o que continua vivo é a segunda causa, o
> `revalidatePath` apontando para rota diferente do `redirect`, e o método
> de leitura: duas causas somam no mesmo sintoma, e vítimas fixas entre
> execuções não são flakiness.

# Contexto

O job `E2E mobile` reprovava em `mudanca-objetivo` (`Experimento ativo` não
encontrado) e `revisao-corporal` (`Scorecard de Progresso` não encontrado).
A leitura anterior tratou o caso como corrida e adicionou âncoras de
navegação, mas as **mesmas duas vítimas** voltaram na execução seguinte.

Cenários fixos entre execuções são regressão, não corrida
(docs/memory/e2e-flaky-sorteia-cenarios-diferentes.md). E o
`error-context.md` descrevia estado impossível para uma corrida: o POST da
Server Action saía `303`, mas a página de destino exibia o passo anterior
— formulário "Ativar Experimento de Plano" ainda montado depois da
ativação, proposta ainda `pendente` depois de criar o rascunho.

Duas causas independentes produziam o mesmo sintoma.

**1. O Service Worker cacheia o prefetch de RSC.** `defaultCache` do
`@serwist/next` fecha com `NetworkFirst` sobre `pages-rsc-prefetch`,
`pages-rsc` e `pages`, guardando 24 h qualquer resposta same-origin. A
regra assume telas equivalentes para todo mundo; aqui quase toda tela
deriva do usuário e muda a cada Server Action. O `<Link>` do Next
prefetcha a etapa seguinte **enquanto a anterior está na tela**, então a
resposta gravada é anterior à escrita.

Isso só aparecia no E2E porque o SW é registrado com
`disable: process.env.NODE_ENV !== "production"` e a suíte passou a rodar
contra `next start` — o mesmo modo do CI. Em `next dev` o bug era
invisível.

**2. Cada action revalidava uma rota diferente da que redirecionava.**
`iniciarExperimento` fazia `revalidatePath("/treino")` e
`revalidatePath("/progresso")`, e então `redirect(".../experimento")`;
`decidirPropostaRevisao` revalidava `/plano/revisao` e redirecionava para
`.../experimento`. As cinco telas do fluxo leem o mesmo registro, e
nenhuma delas era invalidada.

# Aprendizado

**Quando a escrita persiste, o `redirect` acontece e a tela de destino
mostra o estado anterior, o suspeito é cache de leitura — não a
transação.** O trace separa as duas hipóteses sem ambiguidade: `POST 303`
seguido de `GET 200` da rota nova, com o DOM no passo anterior, elimina a
escrita como causa.

`revalidatePath(rota)` invalida **aquela** rota. Um fluxo com etapas que
compartilham a mesma fonte precisa de `revalidatePath(raiz, "layout")`,
que alcança o subtree — inclusive a etapa de destino do `redirect`.

**Um `NetworkOnly` largo demais quebra o offline.** A primeira tentativa
recusou cache para toda navegação e todo RSC same-origin: corrigiu a
Revisão Semanal e derrubou `offline.e2e.test.ts`, porque a navegação sem
rede depende justamente do `NetworkFirst` do `defaultCache`. O recorte
correto é só `Next-Router-Prefetch: 1` — o prefetch especulativo é a
única requisição cuja resposta pode ser anterior à escrita que o usuário
acabou de fazer.

O default de um plugin de PWA é dimensionado para site majoritariamente
público. Em app autenticado, cada `NetworkFirst` sobre HTML/RSC é uma
aposta de que a tela não é derivada do usuário.

# Aplicação futura

- Antes de culpar a transação por dado "que não salvou", confirme no trace
  se o POST retornou 3xx e se a tela de destino veio do cache. Estado
  velho com escrita bem-sucedida é cache, não corrida.
- Server Action que redireciona para rota diferente da que revalida é bug
  latente: ou revalide o destino, ou use `revalidatePath(raiz, "layout")`
  quando as etapas compartilham a leitura.
- Ao mexer em `runtimeCaching`, rode `offline.e2e.test.ts` junto: é o
  único teste que cobre o custo de recusar cache.
- Suspeite do Service Worker quando a falha só aparece contra `next start`
  e some em `next dev` — `disable` amarrado a `NODE_ENV` faz o SW existir
  só num dos modos.
- Vítimas fixas entre execuções não são flakiness. Antes de adicionar
  âncora ou elevar timeout, verifique se as mesmas falharam na rodada
  anterior.

# Evidência

Contra o build de produção, `mudanca-objetivo` falhava de forma
reprodutível (18,4 s até o timeout). Com `serviceWorkers: "block"` em
`playwright.config.ts` — usado só como sonda, revertido em seguida — o
mesmo cenário passou 3/3 em 2–3 s, isolando o SW como causa.[^ci-revisao-semanal-2026-08-29]

A correção do SW sozinha deixou `mudanca-objetivo` ainda vermelho no passo
final, com o formulário de Experimento montado após o `POST 303` de
ativação: era a segunda causa, o `revalidatePath` da rota errada. Com as
duas corrigidas, a suíte fechou 40/40 (antes 35 passed / 2 failed / 3
skipped), e `revisao-corporal`, `mudanca-objetivo` e `offline` passaram 9/9
com `--repeat-each=3`. Nenhum arquivo de teste foi alterado.

[^ci-revisao-semanal-2026-08-29]: `src/app/sw.ts` ganhou uma regra
`NetworkOnly` restrita a `Next-Router-Prefetch === "1"`; a versão
intermediária, que também capturava `request.mode === "navigate"` e todo
`RSC === "1"`, derrubou `offline.e2e.test.ts:50` esperando
`Estado da conexão: Offline`. Em `actions.ts`, as cinco actions passaram a
chamar `revalidarRevisao()` — `revalidatePath("/progresso/revisao", "layout")`.
