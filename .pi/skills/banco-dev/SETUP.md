# Setup e diagnóstico

Leia este arquivo quando `scripts/db.sh check` não retornar `OK`.

## Configuração inicial

Crie o modelo de service:

```bash
.pi/skills/banco-dev/scripts/db.sh setup
```

Edite `~/.pg_service.conf` e preencha a seção criada:

```ini
[athlyt-dev]
host=SEU_HOST
port=5432
dbname=SEU_BANCO
user=SEU_USUARIO
password=SUA_SENHA
sslmode=require
```

Use `sslmode=disable` para PostgreSQL local sem TLS. Para manter a senha
separada, omita `password` e grave-a em `~/.pgpass` no formato
`host:port:dbname:user:senha`. Ambos os arquivos de credenciais devem ter
permissão `600`.

Valide:

```bash
.pi/skills/banco-dev/scripts/db.sh check
```

O setup termina quando o comando retorna `OK`.

## Diagnóstico

| Sintoma | Ação |
|---|---|
| `definition of service "athlyt-dev" not found` | Rode `setup`, preencha a seção `[athlyt-dev]` e repita `check`. |
| `no pg_hba.conf entry ... no encryption` | Defina `sslmode=require` no service. |
| `password authentication failed` | Corrija a senha no service ou em `~/.pgpass`. |
| `could not translate host name` | Corrija o host e verifique se o banco exige VPN. |
| `relation "..." does not exist` | Confira as migrações e, se necessário, rode `npm run db:migrate`. |
| `psql: command not found` | Instale o pacote `postgresql-client` e repita `check`. |
