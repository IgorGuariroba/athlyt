---
type: Development Learning
title: "Após o merge, sincronizar main e remover a branch concluída"
description: "Todo PR mergeado encerra com a main local sincronizada e a branch de trabalho removida local e remotamente."
tags: [git, github, workflow, branches]
status: stable
generated:
  by: agente/gpt-5.6-sol
  at: 2026-07-30T19:54:57-03:00
sources:
  - id: pr-38
    resource: https://github.com/IgorGuariroba/athlyt/pull/38
    title: "PR #38 — etapas de peso e objetivo inspiradas no MacroFactor"
  - id: ci-workflow
    resource: docs/agents/ci.md
    title: "Fluxo de trabalho com main protegida"
---

# Contexto

Depois do merge do PR #38, o repositório local permaneceu na branch de trabalho, enquanto a `main` local estava atrás da `origin/main`. Continuar nesse estado favorece novos commits sobre uma linha de trabalho encerrada e dificulta distinguir código mergeado de trabalho novo.[^pr-38]

# Aprendizado

O merge no GitHub não conclui sozinho o ciclo de trabalho local. A conclusão inclui voltar para a branch principal, sincronizá-la por avanço rápido e remover a branch encerrada.

Esse procedimento mantém a `main` local como base confiável e garante que todo trabalho posterior comece em uma branch nova, criada a partir do estado efetivamente mergeado. Como a `main` é protegida, nenhuma mudança nova deve ser desenvolvida diretamente nela.[^ci-workflow]

# Aplicação futura

Após confirmar que um PR foi mergeado:

1. Verificar se a árvore de trabalho está limpa.
2. Executar `git switch main`.
3. Executar `git pull --ff-only origin main`.
4. Remover a branch local com `git branch -d <branch>`.
5. Confirmar que a branch remota foi removida; se ainda existir, executar `git push origin --delete <branch>`.
6. Permanecer na `main` limpa ou criar uma nova branch a partir dela antes de qualquer alteração.

Nunca apagar uma branch com trabalho não mergeado sem confirmação explícita. Se houver commits feitos depois do merge do PR, preservá-los em uma nova branch antes da limpeza.

# Evidência

Após o PR #38 ser mergeado, a branch local ainda era `feat/triagem-visual-macrofactor` e a `main` local precisava avançar até o merge commit `2237f45`. A sincronização com `--ff-only` e a remoção das branches restauraram uma base local limpa.[^pr-38]

[^pr-38]: Fonte `pr-38`.
[^ci-workflow]: Fonte `ci-workflow`.
