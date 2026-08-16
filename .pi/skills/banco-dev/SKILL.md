---
name: banco-dev
description: Consulta PostgreSQL de desenvolvimento do Athlyt via psql. Use para inspecionar esquema ou dados, investigar estado de sessão ou plano, executar SQL ad hoc e gerenciar a allowlist allowed_email.
compatibility: Requer psql (postgresql-client) e o pg_service athlyt-dev configurado.
allowed-tools: Bash(psql:*) Bash(.pi/skills/banco-dev/scripts/db.sh:*)
---

# Banco de desenvolvimento

Opere o PostgreSQL de desenvolvimento pelo wrapper
`.pi/skills/banco-dev/scripts/db.sh`.

## Processo

1. **Valide a conexão.** Antes da primeira operação da execução, rode:

   ```bash
   .pi/skills/banco-dev/scripts/db.sh check
   ```

   Esta etapa termina quando o comando retorna `OK`. Se faltar configuração,
   siga [SETUP.md](SETUP.md); para outro erro, consulte o diagnóstico no mesmo
   arquivo. Se a conexão continuar indisponível, reporte o erro como bloqueio.

2. **Escolha a operação.** Para leitura, inspecione primeiro o esquema quando
   houver dúvida sobre tabelas ou colunas e então faça uma consulta estreita.
   Para escrita, aplique o gate de aprovação dos Guardrails e pare até o usuário
   decidir. Para mudança de esquema, aplique o fluxo Drizzle dos Guardrails.

3. **Execute e confira.** Rode a operação pelo wrapper. Depois de uma escrita já
   aprovada, faça uma consulta estreita que comprove a pós-condição. A tarefa
   termina somente com o resultado pedido ou um bloqueio concreto; escritas
   terminam somente quando a pós-condição estiver comprovada.

## Comandos

```bash
.pi/skills/banco-dev/scripts/db.sh tables
.pi/skills/banco-dev/scripts/db.sh schema <tabela>
.pi/skills/banco-dev/scripts/db.sh query '<SQL de leitura>'
.pi/skills/banco-dev/scripts/db.sh write --yes '<SQL aprovado pelo usuário>'
.pi/skills/banco-dev/scripts/db.sh psql
```

Sem `--yes`, o comando `write` pede confirmação no terminal; use `--yes` apenas
quando o usuário já tiver aprovado o SQL exato. Para consultas prontas de
allowlist, usuário e migrações, leia [RUNBOOK.md](RUNBOOK.md) somente quando
a solicitação alcançar uma dessas áreas.

## Guardrails

- Mantenha o alvo em `service=athlyt-dev`; rejeite qualquer alvo de produção.
- Mantenha credenciais em `~/.pg_service.conf` ou `~/.pgpass`; trate `.env`, URLs
  de conexão, argumentos e logs como canais inadequados para segredos.
- Faça leituras mínimas: colunas necessárias, filtro específico e `LIMIT` quando
  a cardinalidade puder ser alta. Exiba somente os dados pessoais necessários.
- Execute `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER` e equivalentes
  somente após aprovação explícita do SQL exato pelo usuário.
- Faça mudanças de esquema em `src/db/schema.ts`, seguidas de
  `npm run db:generate` e `npm run db:migrate`; confira a migração aplicada no
  banco em vez de executar DDL avulso.
