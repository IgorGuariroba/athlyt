---
type: Development Learning
title: "Input escondido com sr-only deixa o label interceptar o toque"
description: "Controle nativo escondido vira uma caixa de 1px: o clique atinge o label, não o controle, e o Playwright falha com 'label intercepts pointer events' — estique o input sobre o alvo com opacity-0."
tags: [ui, acessibilidade, e2e, playwright, componentes, toque]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-19T17:00:00-03:00
sources:
  - id: seletor-segmentado
    resource: "src/components/tela/seletor-segmentado.tsx"
    title: "Seletor segmentado do descanso entre séries"
  - id: e2e-descanso
    resource: "e2e/sessao.e2e.test.ts — 'escolhe o descanso entre séries'"
    title: "Cenário E2E que expôs a interceptação de ponteiro"
---

# Contexto

O kit de telas usa um padrão consolidado para controles cujo alvo clicável é a
superfície inteira, e não uma caixinha ao lado do texto: um `input` nativo
escondido dentro de um `label`, com o estado comunicado por
`has-[input:checked]:`. É assim que `ChipSelecao` funciona, e o
`SeletorSegmentado` do descanso entre séries nasceu copiando esse padrão —
inclusive o `className="sr-only"` no input.[^seletor-segmentado]

Os testes unitários passaram (o `radiogroup`, os nomes acessíveis e o
`onChange` estavam corretos) e o componente parecia certo em revisão de código.
O E2E falhou com 30 s de timeout e uma mensagem que não menciona `sr-only`:

```
locator resolved to <input type="radio" class="sr-only" aria-label="Descanso longo: 2:15"/>
element is visible, enabled and stable
<label class="flex min-h-11 flex-1 ..."> intercepts pointer events
```

Sessenta tentativas de clique, todas absorvidas pelo `label`.[^e2e-descanso]

# Aprendizado

`sr-only` não esconde o elemento: encolhe-o para **1×1px** (`w-px h-px
overflow-hidden clip`). O input continua na árvore de acessibilidade — por isso
`getByRole("radio")` o encontra e o teste unitário passa — mas ele deixa de
cobrir a área que o usuário vê. O ponto central do segmento de 44px pertence ao
`label`, não ao controle.

Em uso real isso funciona por um efeito colateral: clicar num `label` associado
reencaminha o evento ao controle. Mas o alvo atingido **não é o controle**, e
isso tem duas consequências concretas:

1. Ferramentas que fazem hit-testing de verdade (Playwright, e qualquer
   automação baseada em coordenadas) acusam interceptação e falham. A mensagem
   incrimina o `label`, o que leva a mexer em `z-index` e `pointer-events` do
   contêiner — o lugar errado.
2. Gestos que dependem do alvo real (arrasto, `:active` no próprio input,
   toque com deslize) degradam, porque só o ponto de 1px responde como controle.

A distinção que importa: `sr-only` serve para **conteúdo** que só o leitor de
tela precisa (um texto auxiliar). Para um **controle** cuja superfície visual é
o alvo, o input deve permanecer do tamanho do alvo e apenas invisível.

`ChipSelecao` não exibe o sintoma por acaso — ele é menor e o texto ocupa quase
todo o chip —, o que torna o padrão enganosamente confiável ao ser copiado para
um componente com segmentos largos.

# Aplicação futura

Ao esconder um controle nativo cuja superfície é o alvo clicável, estique-o
sobre o alvo em vez de encolhê-lo:

```tsx
<label className="relative flex min-h-11 flex-1 items-center justify-center">
  <input
    type="radio"
    className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-pill opacity-0"
  />
  <span className="pointer-events-none">{rotulo}</span>
</label>
```

Três detalhes que fazem parte da correção:

- `opacity-0` em vez de `sr-only`: invisível, mas do tamanho do alvo.
- `appearance-none` e `m-0`: sem isso o controle nativo impõe tamanho e margem
  próprios e a área esticada não bate com o segmento.
- `pointer-events-none` no texto: evita que o próprio rótulo volte a ser o alvo.

E, no teste: **um componente interativo novo não está validado por teste
unitário**. `fireEvent.click` no jsdom não faz hit-testing e passa mesmo com o
alvo errado. Só o E2E (ou um clique por coordenada) exercita a geometria — o que
reforça `docs/memory/mudanca-ui-atualiza-e2e.md`: componente novo entra na
mesma leva que o cenário E2E que o opera.

# Evidência

Com `sr-only`, o cenário do descanso expirou em 30 s acumulando
`<label ...> intercepts pointer events` a cada retry, enquanto os 42 testes
unitários do kit passavam.[^e2e-descanso] Trocando para `absolute inset-0
opacity-0`, o mesmo cenário passou em **1,7 s** e a suíte de sessão fechou 4/4
em 17,6 s, sem alteração nos testes.[^seletor-segmentado]

[^seletor-segmentado]: Consulte `sources` com id `seletor-segmentado`.
[^e2e-descanso]: Consulte `sources` com id `e2e-descanso`.
