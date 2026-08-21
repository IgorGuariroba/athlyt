---
type: Development Learning
title: "\"unknown command\" no `npm run dev` é downgrade de dependência, não bug do script"
description: "Quando um passo do dev-local.sh morre com um subcomando inexistente, verifique o diff não commitado de package.json antes de investigar o script ou o banco."
tags: [dev, dependencias, drizzle, scripts, diagnostico]
status: stable
generated:
  by: agente/claude-sonnet-4.6
  at: 2026-08-21T10:00:00-03:00
sources:
  - id: dev-local-migrar
    resource: scripts/dev-local.sh
    title: "Passo `migrar` do fluxo `npm run dev`"
  - id: diff-package-json
    resource: "git diff HEAD -- package.json"
    title: "Downgrade não commitado de drizzle-kit ^0.31.10 → ^0.18.1"
---

# Contexto

`npm run dev` subia o banco normalmente e abortava em "aplicando migrações" com
`error: unknown command 'migrate'`. O sintoma incrimina o `dev-local.sh` ou a
configuração do Drizzle, mas nada nesses arquivos havia mudado.

A causa era um downgrade **não commitado** de `drizzle-kit` em `package.json`,
de `^0.31.10` para `^0.18.1`, com o `package-lock.json` regenerado junto (1748
linhas removidas). O subcomando `migrate` só existe a partir da 0.20 — na 0.18 o
fluxo era `push`/`up`. O binário instalado simplesmente não tinha o comando.

# Aprendizado

Um erro de *superfície de CLI* ("unknown command", "unknown option", flag que
deixou de existir) em um passo que sempre funcionou é quase sempre versão de
dependência, não código. `git diff HEAD -- package.json package-lock.json` é o
primeiro comando a rodar, antes de ler o script ou o banco.

Downgrades acidentais nascem de resolução automática mal aplicada (`npm install`
com sugestão de peer dependency, ou um agente "corrigindo" um range). O lockfile
regenerado junto disfarça o acidente: `npm ci` reproduz a versão errada com
sucesso e o ambiente fica consistentemente quebrado.

# Aplicação futura

Ao diagnosticar falha de `npm run dev`:

1. `git status --porcelain` e `git diff HEAD -- package.json package-lock.json`.
2. Se houver downgrade: `git checkout -- package.json package-lock.json && npm ci`.
3. Só então investigue script, config ou banco.

Nunca aceite um downgrade de major/minor em `package.json` sem justificativa
escrita — restaure em vez de adaptar o código à versão antiga.

O passo `migrar` do `dev-local.sh` agora chama `verificar_drizzle_kit`, que
falha cedo com a instrução de restauração quando a versão instalada é menor que
0.20. Ao adicionar novos passos que dependam de um subcomando recente de alguma
CLI, replique essa checagem: o custo é baixo e converte um erro opaco em uma
ordem executável.

# Evidência

- `git diff HEAD -- package.json` mostrava `-"drizzle-kit": "^0.31.10"` /
  `+"drizzle-kit": "^0.18.1"`.[^diff-package-json]
- Após `git checkout -- package.json package-lock.json && npm ci`,
  `npx drizzle-kit --version` reportou `0.31.10` e `npm run db:migrate`
  terminou com `[✓] migrations applied successfully!`.[^dev-local-migrar]

[^diff-package-json]: Downgrade não commitado de drizzle-kit.
[^dev-local-migrar]: Passo `migrar` do `dev-local.sh`.
