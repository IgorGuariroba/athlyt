---
type: Development Learning
title: "npm ci exige lock gerado pela mesma versão de npm do runner"
description: "Regenerar package-lock.json com um npm diferente do usado no CI não corrige EUSAGE; é preciso casar a versão e fixar o patch do Node."
tags: [ci, dependencias, npm]
status: stable
generated:
  by: agente/claude-sonnet-4.6
  at: 2026-07-30T17:45:00-03:00
sources:
  - id: run-30579039314
    resource: https://github.com/IgorGuariroba/athlyt/actions/runs/30579039314
    title: "Run do CI que falhou mesmo após regenerar o lock localmente"
  - id: pr-35
    resource: https://github.com/IgorGuariroba/athlyt/pull/35
    title: "PR que introduziu a esteira de CI e corrigiu o lockfile"
---

# Contexto

Na primeira execução real do CI, todos os jobs falharam em ~13s no passo
`npm ci`, com `EUSAGE: Missing: @emnapi/runtime@1.11.3 from lock file`.

A primeira correção — `npm install --package-lock-only` na máquina local —
alterou o lock e parecia resolver, mas o CI seguiu falhando com a mensagem
idêntica. O npm local era 11.6.2; o do runner, 11.16.0.

# Aprendizado

Versões diferentes de npm resolvem dependências opcionais/WASM (aqui,
`@tailwindcss/oxide-wasm32-wasi` e `@emnapi/runtime`) de formas distintas, e
`npm ci` é estrito onde `npm install` é tolerante. Regenerar o lock com um npm
que não seja o do CI produz um arquivo que continua fora de sincronia lá.

Duas consequências práticas:

1. Ao corrigir `EUSAGE` no lock, use a mesma versão de npm do runner:
   `npx -y npm@<versão> install --package-lock-only`. A versão aparece no log
   do passo `actions/setup-node` (linha `npm: x.y.z`).
2. `node-version: "24"` é uma faixa: o runner atualiza o patch sozinho e traz
   um npm novo junto, quebrando `npm ci` sem que ninguém tenha tocado no
   projeto. Fixe o patch exato.

# Aplicação futura

Diante de `npm ci` falhando com `EUSAGE ... from lock file` no CI mas não
localmente, compare primeiro as versões de npm antes de mexer em dependências.
Reproduza o erro com a versão do runner em um diretório limpo — apenas
`package.json` + `package-lock.json` + `npx -y npm@<versão> ci --ignore-scripts`
— para confirmar a correção antes de gastar uma rodada de CI.

Mantenha `NODE_VERSION` fixado em um patch exato em `.github/workflows/ci.yml`.

# Evidência

Erro reproduzido localmente com a versão do runner, em diretório isolado:[^run-30579039314]

```
$ npx -y npm@11.16.0 ci --ignore-scripts
npm error code EUSAGE
npm error Missing: @emnapi/runtime@1.11.3 from lock file
```

Após `npx -y npm@11.16.0 install --package-lock-only`, o mesmo comando passou
com `added 826 packages`, e os cinco checks do PR ficaram verdes.[^pr-35]

[^run-30579039314]: Run 30579039314 — falha persistente após regenerar o lock com npm local.
[^pr-35]: PR #35 — esteira de CI aprovada com 5/5 checks.
