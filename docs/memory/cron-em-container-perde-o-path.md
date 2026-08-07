---
type: Development Learning
title: "Job de cron em container roda com PATH mínimo e falha só na janela agendada"
description: "O cron não herda ambiente nem PATH do PID 1: binários em /usr/local/bin somem, e a falha só aparece de madrugada, depois do deploy passar verde."
tags: [docker, cron, backup, producao, diagnostico]
status: stable
generated:
  by: agente/claude-sonnet-4-6
  at: 2026-08-07T21:30:00Z
sources:
  - id: teste-backup-2026-08-07
    resource: "docker/backup/entrypoint.sh, docker/backup/backup.sh, docker/compose.prod.yml"
    title: "Validação do serviço de backup contra MinIO local, com cron de 1 minuto"
  - id: imagem-postgres-16
    resource: "docker run --rm postgres:16 sh -c 'command -v cron'"
    title: "A imagem oficial do Postgres não traz agendador"
---

# Contexto

O compose de produção ganhou um serviço `backup` que roda `pg_dump` por
cron e envia o dump para bucket S3/R2 com `mc`. A imagem é
`postgres:16` (mesma major do banco, exigência do `pg_dump`) com o
binário `mc` copiado da imagem `minio/mc`.

# Aprendizado

Duas armadilhas aparecem ao agendar trabalho dentro de um container, e
ambas produzem falha **na janela agendada**, não no deploy:

1. **A imagem oficial do Postgres não tem `cron` nem `/etc/cron.d`.**[^imagem-postgres-16]
   Imagens de servidor são feitas para rodar um processo em primeiro
   plano; não presuma agendador. Escrever em `/etc/cron.d` sem
   instalar o pacote falha com `No such file or directory`.

2. **O cron roda o job com PATH mínimo (`/usr/bin:/bin`) e sem o
   ambiente do PID 1.** Binários em `/usr/local/bin` — destino usual
   de um `COPY` — ficam invisíveis. No caso concreto, `pg_dump` (em
   `/usr/bin`) era encontrado e `mc` (em `/usr/local/bin`) não: o job
   geraria o dump e falharia no upload, todo dia às 03:00, sem
   ninguém olhando.

O segundo caso é o perigoso, porque o serviço sobe saudável e o erro
só existe dentro da janela agendada. Um teste que apenas executa o
script à mão passa e esconde o defeito.

# Aplicação futura

Ao agendar qualquer tarefa por cron em container:

- Declare `PATH=` explicitamente como primeira linha do crontab.
- Exporte as variáveis necessárias para um arquivo lido pelo job
  (`. /etc/<algo>` no início da linha); o cron não herda o ambiente do
  entrypoint.
- Redirecione a saída para `/proc/1/fd/1` e `/proc/1/fd/2`, senão os
  logs do job não aparecem em `docker compose logs`.
- **Valide com o cron de fato disparando** — agenda temporária de
  `*/1 * * * *` e a execução manual desativada. Rodar o script à mão
  não exercita o ambiente do cron e não prova nada sobre a agenda.

Para o pipeline de backup em si, valem duas travas: `set -Eeuo
pipefail` (sem `pipefail`, um `pg_dump` que falhe no meio de
`pg_dump | gzip` ainda gera um `.gz` válido e truncado, dado como
sucesso) e verificação de tamanho mínimo antes do upload.

# Evidência

Com o PATH ausente, `env -i PATH=/usr/bin:/bin sh -c "command -v mc"`
respondeu `MC_NAO_ENCONTRADO` enquanto `pg_dump` era resolvido
normalmente — e o bucket permaneceu vazio após dois ciclos completos
de cron, apesar de a execução manual ter enviado o arquivo com
sucesso. Após declarar `PATH=` no crontab, o job passou a disparar
sozinho com `BACKUP_AO_INICIAR=false`.[^teste-backup-2026-08-07]

O ciclo de recuperação foi fechado de ponta a ponta: `DROP TABLE
allowed_email CASCADE`, restauração do último dump vindo do bucket, e
o registro `restauracao@teste.com` de volta com as 24 tabelas do
schema e `/api/saude` em 200. Um dump contra host inexistente
terminou com erro e **não** publicou objeto no bucket, confirmando que
falha de dump não sobrescreve cópias boas.[^teste-backup-2026-08-07]

[^imagem-postgres-16]: `command -v cron` na imagem `postgres:16` devolve "SEM cron".
[^teste-backup-2026-08-07]: Validação contra MinIO local, com o compose de produção completo.
