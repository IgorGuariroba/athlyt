---
type: Development Learning
title: "animation-fill-mode both retém o transform e quebra todo fixed descendente"
description: "Com `both`, o transform do último keyframe fica aplicado para sempre; mesmo a identidade `matrix(1,0,0,1,0,0)` torna o elemento containing block e faz `fixed inset-0` medir o wrapper em vez da viewport."
tags: [css, animacao, layout, containing-block, modal, e2e, diagnostico]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-23T01:45:00-03:00
sources:
  - id: pr-138-fill-mode
    resource: https://github.com/IgorGuariroba/athlyt/pull/138
    title: "PR #138 — E2E navbar-visivel falhando após a navegação por swipe"
  - id: globals-etapa-transicao
    resource: "src/app/globals.css (.etapa-transicao)"
    title: "Animação de entrada aplicada ao wrapper do casco autenticado"
  - id: spec-transforms
    resource: https://www.w3.org/TR/css-transforms-2/#transform-rendering
    title: "CSS Transforms 2 — transform diferente de none cria containing block para fixed"
---

# Contexto

`SwipeNavigation` envolve todo o casco autenticado e aplica `.etapa-transicao`
no wrapper do conteúdo, com uma animação de entrada que desliza o
`translate3d` horizontalmente.[^globals-etapa-transicao]

No CI, `e2e/navbar-visivel.e2e.test.ts` falhava com `Registrar série 2` não
encontrado, e o `error-context.md` mostrava a tela em `/mais` no meio da
sessão de treino.[^pr-138-fill-mode]

# Aprendizado

`animation-fill-mode: both` mantém o estado do **último keyframe** aplicado
depois que a animação termina. Quando esse keyframe tem `transform`, a
propriedade fica retida para sempre — inclusive quando o valor final é a
identidade, `matrix(1, 0, 0, 1, 0, 0)`.

O que importa para o layout não é o valor ser neutro, e sim ser diferente de
`none`: qualquer `transform` != `none` faz o elemento virar containing block
de todo descendente `position: fixed`.[^spec-transforms] A consequência é que
`fixed inset-0` deixa de medir a viewport e passa a medir o wrapper.

Três propriedades tornam isso caro de achar:

- O sintoma aparece longe da causa. O overlay é posicionado fora da tela, o
  conteúdo real sai da viewport e o teste falha num seletor que parece de
  outro assunto.
- A inspeção casual inocenta o wrapper: a animação já terminou, a opacidade
  está em 1 e o transform "parece" neutro.
- Não há erro de console. Nada falha; a geometria é que está errada.

A regra prática: em animação de entrada, use `backwards` (garante o estado
inicial antes do primeiro frame) em vez de `both`. Só use `both` quando o
estado final precisar mesmo persistir — e, nesse caso, não anime `transform`
em um elemento que contenha descendentes `fixed`.

# Aplicação futura

Ao animar um wrapper que envolve telas inteiras, prefira:

```css
/* retém o estado inicial, não o final: nenhum transform sobra */
.etapa-transicao {
  animation: etapa-entra-adiante 240ms ease-out backwards;
}
```

Antes de culpar o seletor de um E2E que falha "longe" do ponto de origem,
meça a caixa do elemento `fixed` contra a viewport:

```ts
await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]')!;
  const b = d.getBoundingClientRect();
  let p = d.parentElement, culpado = null;
  while (p) {
    const t = getComputedStyle(p).transform;
    if (t && t !== "none") { culpado = `${p.className} => ${t}`; break; }
    p = p.parentElement;
  }
  return { caixa: b, viewport: [innerWidth, innerHeight], culpado };
});
```

`caixa` diferente de `0,0 innerWidth×innerHeight` num elemento `fixed inset-0`
prova o desvio, e `culpado` aponta o ancestral que roubou o containing block.

# Evidência

Com `both`, o overlay do timer de descanso media `y=-184` e `994px` de altura
numa viewport de `412×839`, com o wrapper reportando
`transform: matrix(1, 0, 0, 1, 0, 0)` e a animação já concluída
(`opacity: 1`). Trocando para `backwards`, o mesmo overlay passou a medir
`0,0 412×839` e o wrapper reportou `transform: none`; `navbar-visivel` passou
a aprovar.[^pr-138-fill-mode]

Duas hipóteses plausíveis foram derrubadas por medição antes da causa real:
bubbling do gesto de swipe (insustentável, porque o Playwright clica com
`pointerType: "mouse"` e o handler ignora mouse na primeira linha) e clique
caindo na `BottomNav` (refutado por `elementFromPoint` devolver o próprio
botão "Fechar timer" e por `cliqueCaiNaNav: false`).[^pr-138-fill-mode]

O mesmo cenário deste PR já havia produzido
[history-api-com-objeto-url-quebra-a-pwa.md](history-api-com-objeto-url-quebra-a-pwa.md):
um teste com um sintoma chamativo pode ter mais de uma causa independente, e
corrigir a primeira não encerra a investigação enquanto o teste não passar.

[^pr-138-fill-mode]: Consulte `sources` com id `pr-138-fill-mode`.
[^globals-etapa-transicao]: Consulte `sources` com id `globals-etapa-transicao`.
[^spec-transforms]: Consulte `sources` com id `spec-transforms`.
