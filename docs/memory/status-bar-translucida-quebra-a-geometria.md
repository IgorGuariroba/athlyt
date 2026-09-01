---
type: Development Learning
title: "Status bar translúcida só serve a quem consome o inset superior"
description: "Em standalone no iOS, black-translucent reporta viewport menor que a tela e ancorada em y=0; o inset do topo reaparece como faixa morta sob a bottom nav."
tags: [ui, layout, mobile, ios, pwa, viewport, safe-area, e2e]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-16T12:20:00-03:00
sources:
  - id: navbar-standalone-2026-08-16
    resource: "src/app/layout.tsx, src/app/(app)/layout.tsx, src/components/navigation/bottom-nav.tsx, src/app/globals.css, e2e/safe-area-standalone.e2e.test.ts"
    title: "Barra inferior com faixa morta e títulos sob a Dynamic Island no app instalado"
---

# Contexto

Instalado pelo Safari em "Adicionar à Tela de Início" (iPhone 16 Pro Max), o app
mostrava dois defeitos ao mesmo tempo: os títulos das abas ("Início", "Mais")
impressos atrás do relógio e da Dynamic Island, e uma faixa vazia entre a
`BottomNav` e a borda inferior. No Safari com barra de endereço, nada disso
aparecia — e o E2E `navbar-visivel` seguia verde, porque roda em `devices["Pixel
7"]`, sem insets e sem standalone.[^navbar-standalone-2026-08-16]

Medir a captura fecha o caso antes de qualquer hipótese: a faixa inferior tinha
~62pt, e não os 34pt do indicador de home. O número denuncia a origem — era o
**inset superior**, reaparecendo embaixo.

# Aprendizado

`statusBarStyle: "black-translucent"` é um contrato, não um estilo: significa "eu
assumo a área da status bar". Quem o declara sem consumir `env(safe-area-inset-top)`
em lugar nenhum recebe duas punições de uma vez. O conteúdo sobe para debaixo do
relógio, e — o efeito não óbvio — em standalone translúcido o iOS reporta uma
viewport com a **altura da tela menos a status bar, porém ancorada em `y = 0`**, e
zera todos os `safe-area-inset-*`. O casco `h-dvh` mede menos que a tela, é
desenhado colado no topo, e a diferença sobra embaixo como faixa morta. Os dois
sintomas são o mesmo defeito visto pelas duas pontas.

A correção é abandonar o contrato que não se cumpre: com `black`, o iOS posiciona
a webview abaixo da status bar e a geometria fecha sem recorte manual.

Dois detalhes decidem o resultado:

- **Inset inferior com `box-sizing: border-box` come o alvo tocável.** `h-16` mais
  `pb-[safe-bottom]` não empurra a barra para cima: o padding é descontado por
  dentro, e a faixa tocada da aba caía de 64pt para 30pt — abaixo do mínimo de
  44pt de DESIGN.md > Accessibility. A altura precisa somar o inset:
  `h-[calc(4rem+var(--safe-bottom))]`.
- **`env()` inline torna a regressão intestável.** O Chromium do Playwright não
  implementa `Emulation.setSafeAreaInsets` (o comando não existe no protocolo:
  `'Emulation.setSafeAreaInsets' wasn't found`), então `env(safe-area-inset-*)`
  resolve `0px` em todo E2E.

# Aplicação futura

Exponha as safe areas como token em `globals.css` e consuma o token, nunca `env()`
inline. É o que cria o ponto de injeção que torna a geometria testável:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

```tsx
<div className="flex h-dvh flex-col overflow-hidden pt-[var(--safe-top)]">
  <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
  <nav className="h-[calc(4rem+var(--safe-bottom))] shrink-0 pb-[var(--safe-bottom)]" />
</div>
```

No teste, injete os insets de um aparelho real e compare o antes/depois na mesma
página, em vez de afirmar valores absolutos:

```ts
await page.addStyleTag({ content: ":root{--safe-top:62px;--safe-bottom:34px}" });
```

Só adote `black-translucent` quando houver decisão de desenhar sob a status bar —
e, nesse caso, o inset superior precisa ser consumido no mesmo conjunto.

# Evidência

`e2e/safe-area-standalone.e2e.test.ts` passa com a correção e falha ao revertê-la,
com `o título não recuou pelo inset superior — Expected: 62, Received: 0`. A
medição confirma o alvo tocável preservado: sem insets `alturaAba=63`, com insets
`alturaAba=63` (antes da correção caía para 30) e `navFim === innerHeight` nos dois
casos. Suíte completa em 32/34; as duas falhas de `fotos-r2` foram reproduzidas com
`git stash` no `main` e são anteriores à mudança. Capturas em
`evidencias-e2e/safe-area-{antes,depois}.png`.[^navbar-standalone-2026-08-16]

[^navbar-standalone-2026-08-16]: Consulte `sources` com id `navbar-standalone-2026-08-16`.
