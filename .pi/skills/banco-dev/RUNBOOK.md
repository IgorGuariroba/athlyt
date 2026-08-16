# Runbook de consultas

Use apenas a seção correspondente à solicitação. Substitua os valores de
exemplo antes de executar e mantenha a projeção mínima.

## Allowlist de acesso

O login consulta `allowed_email` (`src/auth/allowlist-store.ts`). A comparação
em `src/domain/acesso/allowlist.ts` ignora caixa e espaços, mas preserva `+tag`
e domínio; grave o endereço usado na conta Google.

```bash
# listar autorizações
.pi/skills/banco-dev/scripts/db.sh query \
  'SELECT email FROM allowed_email ORDER BY email'

# autorizar — apresente este SQL exato e aguarde aprovação
.pi/skills/banco-dev/scripts/db.sh write --yes \
  "INSERT INTO allowed_email (email) VALUES ('pessoa@gmail.com') ON CONFLICT (email) DO NOTHING"

# comprovar a autorização
.pi/skills/banco-dev/scripts/db.sh query \
  "SELECT email FROM allowed_email WHERE lower(email) = lower('pessoa@gmail.com')"

# revogar — apresente este SQL exato e aguarde aprovação
.pi/skills/banco-dev/scripts/db.sh write --yes \
  "DELETE FROM allowed_email WHERE lower(email) = lower('pessoa@gmail.com')"

# comprovar a revogação; o resultado esperado é zero linhas
.pi/skills/banco-dev/scripts/db.sh query \
  "SELECT email FROM allowed_email WHERE lower(email) = lower('pessoa@gmail.com')"
```

A alteração vale no próximo login; sair e entrar novamente basta.

## Estado de um usuário

`user` é palavra reservada no PostgreSQL e exige aspas duplas.

```bash
.pi/skills/banco-dev/scripts/db.sh query \
  "SELECT id, email, \"emailVerified\" FROM \"user\" WHERE lower(email) = lower('pessoa@gmail.com') LIMIT 1"
```

## Migrações aplicadas

```bash
.pi/skills/banco-dev/scripts/db.sh query \
  'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5'
```
