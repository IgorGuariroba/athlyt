---
type: Development Learning
title: "E2E reusa o `next dev` deixado no ar e falha por overlay, não por bug"
description: "Com reuseExistingServer, um dev server esquecido na porta 3000 faz a suíte rodar contra o dev overlay do Next, que oclui os cantos da bottom nav e produz timeouts sem erro algum na aplicação."
tags: [e2e, playwright, nextjs, dev-server, falso-positivo, diagnostico]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-28T16:30:00-03:00
sources:
  - id: abas-dieta-treino-2026-08-28
    resource: "playwright.config.ts (webServer.reuseExistingServer), src/components/navigation/bottom-nav.tsx, logs de watch mtdca7ln e mtdcgibg"
    title: "Suíte E2E na reorganização das abas: 6 falhas contra dev server, 40/40 contra next start"
---

# Contexto

Durante a separação das abas Dieta e Treino, subi `npm run dev` para inspecionar as telas e deixei o processo no ar. A suíte E2E seguinte acusou 6 falhas. O log do Playwright repetia, em todas, a mesma linha:

```
<nextjs-portal></nextjs-portal> from <script data-nextjs-dev-overlay="true">…</script> subtree intercepts pointer events
```

O console do browser estava limpo, o `page snapshot` mostrava a tela renderizada corretamente e o servidor não registrava erro. Os testes morriam por timeout de clique.

O `playwright.config.ts` define `webServer.command` como `npx next start` — build de produção, sem overlay — mas com `reuseExistingServer: true`. Como a porta 3000 já estava ocupada, o Playwright **reusou o dev server** em vez de subir o de produção. A suíte inteira rodou contra o compilador e o overlay.

A armadilha secundária foi diagnosticar o sintoma: movi `devIndicators.position` para `bottom-right`, o que apenas transferiu a oclusão da primeira aba (Dieta) para a última (Mais). Numa bottom nav que ocupa a largura toda, **nenhum canto é seguro** — o indicador do Next é ancorado num canto inferior, e ali sempre haverá uma aba.

Encerrado o dev server e revertida a config, a mesma suíte fechou 40/40 contra `next start`.

# Aprendizado

`reuseExistingServer: true` silenciosamente troca o ambiente sob teste pelo que estiver na porta. Um dev server esquecido pelo agente converte a suíte inteira em falso positivo, com sintomas que imitam bug de UI: elemento visível, estável, e mesmo assim não clicável.

Duas regras derivam disso:

1. **Antes de rodar E2E, garanta que a porta está livre.** Se o agente subiu `npm run dev` para inspeção visual, mate o processo antes da suíte. Falha em E2E com dev server no ar não é evidência sobre o produto.
2. **`intercepts pointer events` vindo de `nextjs-portal` nunca é bug da aplicação.** É o overlay de dev. Não corrija movendo o indicador: corrija o ambiente.

Sinal de reconhecimento rápido: falhas em massa, espalhadas por arquivos sem relação entre si, todas por timeout de clique e sem nenhum erro de console — o denominador comum é o ambiente, não o código.

# Aplicação futura

Ao investigar falha de E2E, verifique primeiro **contra o que a suíte rodou**. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` antes de disparar a suíte; se responder, descubra qual processo é o dono antes de interpretar qualquer resultado.

Ao bisseccionar com `git stash` para separar regressão de falha pré-existente, lembre que o resultado só é válido se ambas as execuções usaram o mesmo servidor. Nesta investigação, `registro-por-foto` foi classificado como "pré-existente" justamente porque as duas rodadas da bissecção usaram o dev server — e ele passa normalmente em produção.

# Evidência

Mesma suíte, mesmo commit, dois ambientes:[^abas-dieta-treino-2026-08-28]

- contra `next dev` reusado: `6 failed, 34 passed (3.6m)`, todas com `nextjs-portal … intercepts pointer events`;
- contra `next start` após `npm run build`: `40 passed (1.2m)`.

As falhas atingiam `diario`, `fotos-r2`, `registro-por-foto`, `sessao` (dois casos) e `substituicao` — arquivos sem relação funcional entre si, o que apontava para causa ambiental e não para regressão da mudança de abas.
