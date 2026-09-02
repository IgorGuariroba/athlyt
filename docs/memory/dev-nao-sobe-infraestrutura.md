---
type: Development Learning
title: "O contrato que protege CI e E2E é o comando do webServer, não a pureza do `dev`"
description: "npm run dev pode (e hoje deve) subir banco, migração e sessão de propósito: o que isola o Playwright e o CI de qualquer conveniência local é playwright.config.ts nunca chamar npm run dev."
tags: [ci, e2e, playwright, docker, scripts, ambiente]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-07T16:15:00-03:00
sources:
  - id: pr-61
    resource: "package.json, docker/compose.yml, playwright.config.ts, .github/workflows/ci.yml"
    title: "Job E2E falhando em `config.webServer was not able to start`, PR #61"
  - id: pr-75
    resource: "playwright.config.ts, .github/workflows/ci.yml"
    title: "PR #75 — E2E passa a rodar contra `next start`/build de produção, não contra `npm run dev`"
  - id: pr-79
    resource: "scripts/dev-local.sh, package.json"
    title: "PR #79 — `npm run dev` unifica banco + migração + sessão + `next dev` de propósito"
---

# Contexto

Em 2026-08-07 (PR #61), `npm run dev` e `npm start` passaram a chamar `npm run
db:up`, subindo o Postgres por Docker Compose. O job E2E do CI quebrou com
`Process from config.webServer was not able to start`, porque
`playwright.config.ts` usava `npm run dev` como `webServer` e o runner do CI já
fornece Postgres como *service*, sem Docker Compose disponível.[^pr-61]

A correção da época foi desacoplar `dev` de `db:up` e criar `dev:banco` como
variante — regra registrada aqui como "o script `dev` não pode subir
infraestrutura".

Essa regra deixou de valer. Dois PRs posteriores mudaram o que de fato protege
o CI:

- **PR #75** tirou `npm run dev` do caminho do Playwright: `webServer.command`
  passou a ser `next start` (ou `E2E_COMANDO`), servindo um build de produção
  — nunca mais o script `dev`.[^pr-75]
- **PR #79** uniu de propósito banco, migração, sessão de desenvolvimento e
  `next dev` em `npm run dev` (`scripts/dev-local.sh`), exatamente o
  acoplamento que a versão anterior desta memória proibia.[^pr-79]

Hoje `npm run dev` sobe banco, roda migração, semeia sessão sem OAuth e só
então inicia `next dev` — e o E2E nunca o invoca.

# Aprendizado

O invariante que protege CI e E2E nunca foi "`dev` tem que ser só a
aplicação". Foi sempre **"o comando que o Playwright usa como `webServer` não
pode depender de infraestrutura que o ambiente de teste não provisiona"**.
Antes do PR #75, a única forma de garantir isso era manter `dev` puro, porque
`dev` *era* o `webServer`. Depois do PR #75, o `webServer` é outro comando
(`next start`/`E2E_COMANDO`), e a pureza de `dev` deixou de ser condição
necessária — o ponto de verificação migrou de "o que `dev` faz" para "o que
`playwright.config.ts` chama".

A conveniência local (banco + migração + sessão automáticos em `npm run dev`)
não é dívida a ser revertida: é o desenho atual, documentado em
`scripts/dev-local.sh`, e existe porque o script deixou de ser compartilhado
com o E2E.

O segundo caso do incidente original continua válido e não mudou: `docker
compose.yml` versionado com volume `external` apontando para uma máquina
específica quebra CI e qualquer clone. Volumes gerenciados pelo próprio
compose seguem sendo a forma correta.

# Aplicação futura

Antes de acoplar conveniência de infraestrutura a um script, a pergunta certa
não é "este script parece o `dev` de sempre", é:

```bash
grep -n "webServer" playwright.config.ts
grep -rn "npm run dev\|npm start\|E2E_COMANDO" playwright.config.ts .github/workflows/
```

Se o comando do `webServer` não referenciar o script que você está mudando, o
acoplamento é seguro por construção — é o caso de `npm run dev` hoje.

Se algum dia o `webServer` voltar a usar `npm run dev` (ou qualquer script
convertido em ponto de entrada do E2E/CI), a regra original volta a valer:
mantenha esse script como só a aplicação e crie uma variante para a
conveniência, nunca o contrário.

Ao versionar `compose.yml` (dev ou produção), use volumes gerenciados pelo
compose. Preservar dados de uma máquina específica é migração pontual
(`pg_dumpall` + restore no volume novo), não configuração versionada.

# Evidência

`playwright.config.ts` atual declara o `webServer` da aplicação como
`` `AUTH_URL=... OPENROUTER_BASE_URL=... ${comandoServidor}` ``, onde
`comandoServidor` é `npx next start -p ${porta}` por padrão — nenhuma menção a
`npm run dev`.[^pr-75] `scripts/dev-local.sh` (`subir()`) executa `subir_banco`,
`migrar`, `criar_sessao_dev` e só então `iniciar_next`, com `npm run dev` como
`bash scripts/dev-local.sh up` em `package.json`.[^pr-79]

No incidente original, o log do job trazia `[WebServer] external volume
"7361bd..." not found` imediatamente antes do erro do Playwright; após
desacoplar `dev` de `db:up` e tornar o volume gerenciado, os 6 checks ficaram
verdes.[^pr-61]

[^pr-61]: Consulte `sources` com id `pr-61`.
[^pr-75]: Consulte `sources` com id `pr-75`.
[^pr-79]: Consulte `sources` com id `pr-79`.
