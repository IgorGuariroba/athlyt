---
name: banco-dev
description: Consulta e manipula o banco PostgreSQL de desenvolvimento do Athlyt pela CLI psql, sem expor credenciais. Use ao inspecionar tabelas, conferir dados de uma feature, depurar estado de sessão/plano, gerenciar a allowlist de acesso (allowed_email) ou rodar SQL ad-hoc contra o banco de dev.
compatibility: Requer psql (postgresql-client) instalado e um pg_service configurado (ver Setup).
allowed-tools: Bash(psql:*) Bash(scripts/db.sh:*)
---

# Banco de dados de desenvolvimento (Athlyt)

O Athlyt usa **PostgreSQL** (ADR 0003) com Drizzle ORM. Não é MySQL — o
driver é `postgres` e a CLI correspondente é `psql`.

Esta skill acessa o banco **sem nunca ler o `.env` do projeto** e sem
colocar senha em linha de comando: a conexão vem de um `pg_service`,
mecanismo nativo do Postgres.

## Setup (uma vez)

O arquivo de credenciais fica **fora do repositório**, em `~/.pg_service.conf`.

```bash
scripts/db.sh setup
```

O comando cria um modelo em `~/.pg_service.conf` com permissão `600`.
Preencha com os dados do banco de dev e salve:

```ini
[athlyt-dev]
host=SEU_HOST
port=5432
dbname=SEU_BANCO
user=SEU_USUARIO
password=SUA_SENHA
sslmode=require
```

> `sslmode=require` é necessário em bancos gerenciados (Neon, Supabase,
> Railway). Para um Postgres local, troque por `sslmode=disable`.

Se preferir manter a senha separada, omita a linha `password` e use
`~/.pgpass` (formato `host:port:dbname:user:senha`, também `chmod 600`).

Valide a configuração:

```bash
scripts/db.sh check
```

## Uso

Todos os comandos abaixo usam `service=athlyt-dev`; nenhum segredo
aparece no comando, no histórico do shell ou nos logs.

```bash
scripts/db.sh tables               # lista as tabelas
scripts/db.sh schema allowed_email # descreve uma tabela
scripts/db.sh query "SELECT ..."   # SQL de leitura
scripts/db.sh write "INSERT ..."   # SQL de escrita (pede confirmação)
scripts/db.sh psql                 # sessão psql interativa
```

Ou direto pela CLI, quando precisar de algo que o wrapper não cobre:

```bash
psql service=athlyt-dev -c 'SELECT ...'
```

## Regras de segurança

1. **Nunca** leia o `.env` nem passe a URL de conexão como argumento —
   use sempre `service=athlyt-dev`. Segredo em argumento vaza para
   `ps`, histórico do shell e logs do agente.
2. **Leitura é livre; escrita exige confirmação explícita do usuário.**
   `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE` e `ALTER` só depois
   de o usuário aprovar o comando exato.
3. **Nunca aponte esta skill para o banco de produção.** O service se
   chama `athlyt-dev` de propósito.
4. **Não exiba dados pessoais além do necessário.** Ao investigar,
   selecione as colunas relevantes em vez de `SELECT *`.
5. **Mudanças de esquema não se fazem por SQL solto.** O esquema é
   versionado por Drizzle: edite `src/db/schema.ts` e rode
   `npm run db:generate` + `npm run db:migrate`. SQL manual em DDL
   dessincroniza as migrações.

## Tarefas comuns

### Allowlist de acesso

O login exige que o e-mail esteja na tabela `allowed_email`
(`src/auth/allowlist-store.ts`). Quem autentica no Google mas está fora
da lista cai em `/acesso-restrito`.

A comparação (`src/domain/acesso/allowlist.ts`) ignora
maiúsculas/minúsculas e espaços, mas **não** normaliza `+tag` nem
domínio: grave o endereço exato usado no Google.

```bash
# quem está autorizado
scripts/db.sh query 'SELECT email FROM allowed_email ORDER BY email'

# autorizar um e-mail
scripts/db.sh write "INSERT INTO allowed_email (email) VALUES ('pessoa@gmail.com') ON CONFLICT (email) DO NOTHING"

# revogar
scripts/db.sh write "DELETE FROM allowed_email WHERE email = 'pessoa@gmail.com'"
```

A allowlist é lida a cada login: não precisa de rebuild nem restart,
basta sair e entrar de novo.

### Estado de um usuário

```bash
scripts/db.sh query 'SELECT id, email, "emailVerified" FROM "user" ORDER BY email'
```

`user` é palavra reservada no Postgres — sempre entre aspas duplas.

### Migrações aplicadas

```bash
scripts/db.sh query 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5'
```

## Diagnóstico

| Sintoma | Causa provável |
|---|---|
| `definition of service "athlyt-dev" not found` | `~/.pg_service.conf` ausente ou sem a seção `[athlyt-dev]` — rode `scripts/db.sh setup` |
| `no pg_hba.conf entry ... no encryption` | falta `sslmode=require` no service |
| `password authentication failed` | senha errada no service/`.pgpass` |
| `could not translate host name` | host errado, ou banco remoto exigindo VPN |
| `relation "..." does not exist` | migrações não aplicadas: `npm run db:migrate` |

Alternativa gráfica, sem esta skill: `npx drizzle-kit studio`.
