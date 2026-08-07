---
type: Development Learning
title: "O script `dev` não pode subir infraestrutura: ele é o webServer do E2E"
description: "Acoplar `docker compose up` ao `npm run dev` quebra o job E2E, que usa `dev` como webServer e já recebe Postgres como service do CI."
tags: [ci, e2e, playwright, docker, scripts, ambiente]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-07T16:15:00-03:00
sources:
  - id: pr-61
    resource: "package.json, docker/compose.yml, playwright.config.ts, .github/workflows/ci.yml"
    title: "Job E2E falhando em `config.webServer was not able to start`"
---

# Contexto

Para simplificar o desenvolvimento local, `npm run dev` e `npm start` passaram a chamar `npm run db:up`, que sobe o Postgres por Docker Compose. Cinco jobs do CI ficaram verdes e o E2E falhou com `Process from config.webServer was not able to start. Exit code: 1`.[^pr-61]

# Aprendizado

`playwright.config.ts` usa `npm run dev` como `webServer`. O job E2E do CI já fornece Postgres como *service* do GitHub Actions e não tem Docker Compose disponível — então o `dev` tentava subir um container onde não havia nenhum, e o Playwright interpretava a saída não-zero como servidor que não subiu.

A regra geral: **o script que o Playwright usa como `webServer` precisa ser só a aplicação.** Quem provisiona banco é o ambiente (compose local, service do CI, container de teste), nunca o script de desenvolvimento. Conveniência local que muda o contrato de um script compartilhado vira falha em outro ambiente.

O mesmo PR expôs um segundo caso da mesma família: `docker/compose.yml` declarava o volume como `external`, apontando para o volume anônimo de uma máquina específica (`external volume "7361bd..." not found`). Arquivo versionado que só funciona em uma máquina quebra o CI e qualquer clone.

# Aplicação futura

Ao adicionar conveniência de infraestrutura a um script, crie uma variante em vez de alterar o script existente:

```jsonc
"dev": "next dev",                    // usado pelo Playwright e pelo CI
"dev:banco": "npm run db:up && next dev"  // conveniência local
```

Antes de mexer em `dev`, `start` ou `build`, verifique quem mais os consome:

```bash
grep -rn "npm run dev\|npm start" playwright.config.ts .github/workflows/
```

E ao versionar um `compose.yml`, use volumes gerenciados pelo compose. Preservar dados de uma máquina específica é migração pontual (`pg_dumpall` + restore no volume novo), não configuração versionada.

# Evidência

O log do job trazia `[WebServer] external volume "7361bd..." not found` imediatamente antes do erro do Playwright — o Compose falhava, e o `&&` impedia o `next dev` de rodar. Após desacoplar `dev` de `db:up` e tornar o volume gerenciado, os 6 checks ficaram verdes; localmente, os 25 E2E passaram contra um `next dev` sem Docker, reproduzindo a condição do CI.[^pr-61]

[^pr-61]: Consulte `sources` com id `pr-61`.
