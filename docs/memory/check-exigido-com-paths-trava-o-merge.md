---
type: Development Learning
title: "Check exigido pelo ruleset não pode ter gatilho condicional"
description: "Tirar um job do caminho crítico do CI só é seguro se ele sair junto da lista de required_status_checks — um check exigido cujo job não roda deixa o PR esperando para sempre."
tags: [ci, github-actions, rulesets, e2e, performance]
status: stable
generated:
  by: agente
  at: 2026-08-23T20:10:00-03:00
sources:
  - id: run-32659861197
    resource: gh api repos/:owner/:repo/actions/runs/32659861197/jobs
    title: "Cronometragem por passo da esteira antes da refatoração"
  - id: ruleset
    resource: gh api repos/:owner/:repo/rulesets/20077396
    title: "Ruleset 'main protegida' e seus required_status_checks"
---

# Contexto

A esteira levava ~8 min. A cronometragem por passo mostrou que o gargalo não
era o E2E (1 min 11 s), e sim o passo `Renderização das stories` dentro do job
`estatica`: **4 min 16 s** para abrir 54 stories em Chromium. Como `e2e`
declarava `needs: [estatica, unidade, integracao, build]`, o único portão que
exercita o produto de verdade só começava no minuto 6.[^run-32659861197]

# Aprendizado

Duas coisas distintas encareciam o CI, e cada uma tem cura própria:

1. **Ordem.** `needs` deve listar só a dependência *material* — no E2E, apenas
   o artefato de `build`. Encadear jobs baratos antes do caro não economiza
   nada: em `pull_request` todos rodam de qualquer forma, e um vermelho já
   reprova o PR. O `needs` só serializava o relógio.
2. **Frequência.** Um passo cujo resultado muda por outra causa que não o
   commit não pertence ao CI de PR. Render/a11y da galeria responde a mudança
   no design system; `npm audit` responde à publicação de um CVE. Ambos viraram
   workflow próprio com `schedule` + `workflow_dispatch` + `pull_request` com
   filtro de `paths`.

A armadilha está no passo 2 combinado com branch protection: um `context` que
continua em `required_status_checks` mas cujo job passou a ter filtro de
`paths` **trava o merge para sempre** num PR que não toque esses caminhos — o
GitHub fica esperando um check que nunca será reportado. Não é vermelho, é
pendente eterno, e o sintoma não aponta para a causa.

# Aplicação futura

Ao tirar um job do `ci.yml` ou dar a ele gatilho condicional, atualize o
ruleset na mesma mudança:

```
gh api repos/:owner/:repo/rulesets/20077396 -q \
  '.rules[] | select(.type=="required_status_checks")'
```

Regra prática: **só entra em `required_status_checks` job que roda em todo
PR**. Antes de otimizar a esteira, meça por passo — o gargalo raramente é o
job que parece caro:

```
gh api repos/:owner/:repo/actions/runs/<id>/jobs -q \
  '.jobs[] | "== \(.name)", (.steps[] | "\(.name)\t\(.started_at)\t\(.completed_at)")'
```

# Evidência

Antes: 8 min 10 s no total; `estatica` 5 min 25 s (dos quais 4 min 16 s de
render das stories), `e2e` iniciando às 19:06:05 num run que começou às
19:00:36.[^run-32659861197] O ruleset exigia 6 contexts, incluindo
`Auditoria de dependências`;[^ruleset] ao tornar esse job condicional por
`paths`, ele foi removido da lista, que passou a 5.

[^run-32659861197]: `gh api repos/:owner/:repo/actions/runs/32659861197/jobs`.
[^ruleset]: `gh api repos/:owner/:repo/rulesets/20077396`.
