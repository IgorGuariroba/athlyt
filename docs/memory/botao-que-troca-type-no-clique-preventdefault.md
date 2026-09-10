---
type: Development Learning
title: "Botão que troca o type no clique precisa de preventDefault"
description: "Trocar o type de um botão de button para submit no próprio clique faz a ação padrão do clique — avaliada depois do handler — submeter o formulário no estado novo."
tags: [react, formularios, ui, e2e, diagnostico]
status: stable
generated:
  by: agente:pi-coding-agent
  at: 2026-09-10T11:30:00-03:00
sources:
  - id: registro-serie-lapis
    resource: src/components/sessao/registro-serie.tsx
    title: "iniciarCorrecao com evento.preventDefault(); clique no lápis virava submissão"
  - id: correcao-serie-e2e
    resource: e2e/correcao-serie.e2e.test.ts
    title: "E2E que reproduz o clique no lápis e exige a edição aberta depois de 3 s"
---

# Contexto

A correção de série registrada usa o mesmo botão em três papéis: ✓ registra, lápis abre a edição, ✓ salva. O clique no lápis só chamava `setEditando(true)` — e o E2E mostrava a edição abrindo e fechando sozinha em ~140 ms, sem remontagem (nenhum unmount no console) e sem erro.

# Aprendizado

O navegador avalia a **ação padrão do clique depois de os handlers rodarem**. Com eventos discretos, o React processa o re-render sincronamente dentro do dispatch: quando o handler termina, o botão já tem `type="submit"` no DOM, e o comportamento de ativação do botão — decisão tomada agora, não no `mousedown` — submete o formulário. Resultado: abrir a edição salvava imediatamente uma correção igual à atual e fechava a edição, sempre.

O bug é invisível para testes que simulam o fluxo completo com `fill`+`click` (o estado intermediário dura 1 frame) e invisível em revisão de código: o `type="button"` está lá, só muda no mesmo clique que o anula. Só um teste que entra no estado intermediário e **permanece** nele captura o defeito.

# Aplicação futura

Sempre que um handler de clique mudar o `type` do próprio botão (ou trocar entre `<button type="submit">` e outro papel no mesmo lugar), chame `event.preventDefault()` no handler. E valide estados intermediários em E2E: o teste precisa afirmar que o estado permanece após um intervalo, não só que ele foi alcançado.

# Evidência

Instrumentação de mount/unmount mostrou nenhum remontagem entre `EDITANDO true` e `EDITANDO false` — o estado foi descartado pelo próprio fluxo do clique. O stack do `corrigir` apontava `executeDispatch` do react-dom: a submissão vinha da mesma árvore de eventos do clique[^registro-serie-lapis]. Com `preventDefault()` no clique do lápis, o E2E de correção completa passou (`e2e/correcao-serie.e2e.test.ts`)[^correcao-serie-e2e].

[^registro-serie-lapis]: `src/components/sessao/registro-serie.tsx`, comentário em `iniciarCorrecao`.
[^correcao-serie-e2e]: `npx playwright test e2e/correcao-serie.e2e.test.ts --project=mobile-chrome` verde.
