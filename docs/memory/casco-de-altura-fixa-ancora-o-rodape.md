---
type: Development Learning
title: "Rodapé só fica ancorado se o casco travar a altura na viewport"
description: "Trave o casco na viewport, fixe a bottom nav e estabeleça o containing block do scroll container para não criar rolagem dupla."
tags: [ui, layout, mobile, css, pwa, viewport]
status: stable
generated:
  by: agente/claude-sonnet-4-6
  at: 2026-08-13T17:30:00-03:00
sources:
  - id: navbar-coberta-2026-08-13
    resource: "src/app/(app)/layout.tsx, src/app/layout.tsx, src/components/navigation/bottom-nav.tsx, e2e/navbar-visivel.e2e.test.ts"
    title: "Barra de navegação coberta no Início, na prévia do treino e no resumo"
---

# Contexto

Em três telas com conteúdo mais alto que a tela — Início com plano ativo, prévia do treino do dia e resumo do treino concluído — a `BottomNav` aparecia parcialmente coberta pela barra do navegador no celular. O casco autenticado usava `min-h-full` com `<main class="flex-1 overflow-y-auto">` e a nav como irmã `sticky bottom-0`.[^navbar-coberta-2026-08-13]

# Aprendizado

`min-height` percentual não contém o `<main>`: quando o conteúdo cresce, quem rola é o documento, e `sticky bottom-0` só cola dentro do próprio container de rolagem — fora dele a nav volta a ser um elemento no fim do fluxo e desce junto. Some-se `viewportFit: "cover"`, que estende o documento até a borda física, e a faixa final cai atrás da barra de UI do navegador. O `pb-[env(safe-area-inset-bottom)]` da nav compensa apenas o inset do sistema, não o excedente dessa barra.

Dois detalhes decidem o resultado e são fáceis de errar:

- `h-dvh` num item flex é anulado por `flex-1` (que define `flex-basis: 0`); o casco não pode ter as duas classes.
- sem `min-h-0`, o `<main>` não encolhe abaixo do próprio conteúdo e continua empurrando a nav para fora da tela, mesmo com o pai de altura fixa.
- controles `position: absolute` dentro de um scroll container precisam de um containing block (`relative`) no casco; caso contrário, inputs ocultos podem aumentar `document.documentElement.scrollHeight` e criar uma segunda barra.

# Aplicação futura

Cascos com rodapé fixo travam a altura na viewport dinâmica e transferem a rolagem para o conteúdo:

```tsx
<div className="flex h-dvh flex-col overflow-hidden">
  <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4rem+var(--safe-bottom))]">{children}</main>
  <BottomNav />   {/* fixed na viewport */}
</div>
```

Em controles escondidos, prefira input transparente cobrindo o alvo (`absolute inset-0 size-full opacity-0`) a `sr-only`, para que o alvo de toque e a posição do controle permaneçam no componente.

Cubra a regressão com asserção geométrica em vez de inspeção visual: a nav precisa terminar dentro de `window.innerHeight` e `document.scrollingElement` não pode ter excedente de rolagem, verificados no topo e após rolar.

# Evidência

O E2E `e2e/navbar-visivel.e2e.test.ts` passa com a correção e falha ao revertê-la, com `o documento inteiro rola — Expected: <= 1, Received: 919`. Vídeo e capturas em `evidencias-e2e/2026-08-13_17-21-54-navbar-visivel.webm` e `evidencias-e2e/navbar-{inicio,previa,resumo}-*.png` mostram o rodapé íntegro nas três telas, roladas.[^navbar-coberta-2026-08-13]

[^navbar-coberta-2026-08-13]: Consulte `sources` com id `navbar-coberta-2026-08-13`.
