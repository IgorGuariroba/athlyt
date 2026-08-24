---
type: Development Learning
title: "Componente definido dentro da rota escapa do catálogo, do Storybook e da governança"
description: "A cobrança de story e teste de contrato varre `src/components/**`; um componente criado ao lado do `page.tsx` fica invisível para ela e para `ui_catalogo`, e a próxima tela o reinventa."
tags: [design-system, storybook, governanca, nextjs, app-router, ui]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-24T15:35:00-03:00
sources:
  - id: extracao-diario-2026-08-24
    resource: "src/components/diario/, src/app/(app)/diario/page.tsx, src/arquitetura/governanca-ui.ts, .pi/extensions/ui-componentes/catalogo.ts"
    title: "Extração da aba Diário para a camada de componentes compartilhados"
---

# Contexto

A tela do Diário parecia coberta pela governança: `npm run ui:verificar` estava
verde, `storybook build` também. Mas o painel de macros vivia em
`src/app/(app)/diario/painel-macros.tsx`, e os três cartões da linha do tempo
(sessão, refeição planejada, consumo confirmado) eram JSX cru dentro de uma
função `cartao()` no próprio `page.tsx`. Nenhum dos quatro tinha story ou teste
de contrato, e nenhum aparecia em `ui_catalogo`.[^extracao-diario-2026-08-24]

Não havia falha a corrigir no portão: ele fazia exatamente o que fora escrito
para fazer. `lerCatalogo` varre `src/components/**` e `validarGaleria` cobra
story e teste dos arquivos que essa varredura devolve. O que nasce em
`src/app/**` nunca entra na lista, então nunca é cobrado.

# Aprendizado

Um portão que deriva o universo do que fiscaliza a partir de um diretório tem um
ponto cego exatamente do lado de fora dele — e esse lado de fora é o caminho mais
curto para quem está escrevendo a tela. Colocar o componente ao lado do `page.tsx`
não custa nada e não acende nenhuma luz: verde no `ui:verificar`, verde no
Storybook, verde no CI.

O efeito não é estético. Sem entrada no catálogo, a peça é invisível para o
agente que compõe a próxima tela, que então reescreve uma variante divergente —
foi assim que a barra de macro do Diário passou a existir em paralelo ao
`BarraMacro` do kit, com outra altura e outro fundo.

A regra "toda tela é composição de componentes compartilhados" precisa ser
verificável pelo complemento: varrer `src/app/**` e reprovar todo `.tsx` que não
seja arquivo de convenção do Next (`page`, `layout`, `loading`, `error`,
`global-error`, `not-found`, `template`, `default`) e exporte uma função com nome
de componente.

# Aplicação futura

- Ao criar uma peça de interface durante o trabalho numa tela, escreva-a em
  `src/components/<camada>/` desde o primeiro momento, com `*.stories.tsx` ao
  lado e teste de contrato em `__tests__/`. Não existe etapa "depois eu extraio".
- Ao adicionar uma camada nova em `src/components/`, inclua-a em
  `CAMADAS_DE_COMPONENTE` e em `CAMADAS_COM_TESTE_DE_CONTRATO`
  (`src/arquitetura/governanca-ui.ts`): camada ausente da lista é camada sem
  cobrança de teste, silenciosamente.
- Server actions não impedem a extração. O cartão recebe o `<form>` por slot
  (`confirmacao`, `acoes`); a página continua dona da action, o componente fica
  dono da forma — e assim renderiza no Storybook sem servidor.
- Ao herdar dívida deste tipo, prefira uma lista explícita que só encolhe
  (`COMPONENTES_DE_TELA_NAO_MIGRADOS`) a afrouxar a regra: o portão passa a
  valer para tudo que for escrito de agora em diante.

# Evidência

Antes da extração, com o portão verde: `painel-macros.tsx` e os três cartões da
linha do tempo somavam zero stories e zero testes de contrato, e `ui_catalogo`
não listava nenhum deles. Depois de mover para `src/components/diario/`, os
mesmos componentes exigiram 5 arquivos de story e 11 testes de contrato para o
`ui:verificar` voltar a ficar verde — cobrança que a governança não tinha como
fazer enquanto o código morava na pasta da rota. A checagem nova
(`componentesForaDoCatalogo`) encontrou outros 15 componentes na mesma condição
espalhados por triagem, plano e progresso.[^extracao-diario-2026-08-24]

[^extracao-diario-2026-08-24]: Extração da aba Diário para `src/components/diario/` e ampliação de `src/arquitetura/governanca-ui.ts`, sessão de 2026-08-24.
