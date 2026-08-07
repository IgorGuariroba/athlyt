#!/usr/bin/env bash
#
# Agenda o backup por cron e mantém o container vivo.

set -Eeuo pipefail

AGENDA="${BACKUP_CRON:-0 3 * * *}"

# O cron não herda o ambiente do PID 1: sem exportar as variáveis para
# um arquivo lido pelo job, `backup.sh` rodaria sem senha nem
# credenciais e falharia só na primeira execução agendada — de
# madrugada, sem ninguém olhando.
{
  echo "export PGPASSWORD='${POSTGRES_PASSWORD:-}'"
  echo "export POSTGRES_USER='${POSTGRES_USER:-}'"
  echo "export POSTGRES_DB='${POSTGRES_DB:-}'"
  echo "export POSTGRES_HOST='${POSTGRES_HOST:-db}'"
  echo "export BACKUP_S3_ENDPOINT='${BACKUP_S3_ENDPOINT:-}'"
  echo "export BACKUP_S3_ACCESS_KEY_ID='${BACKUP_S3_ACCESS_KEY_ID:-}'"
  echo "export BACKUP_S3_SECRET_ACCESS_KEY='${BACKUP_S3_SECRET_ACCESS_KEY:-}'"
  echo "export BACKUP_S3_BUCKET='${BACKUP_S3_BUCKET:-}'"
  echo "export BACKUP_S3_PREFIXO='${BACKUP_S3_PREFIXO:-athlyt/postgres}'"
  echo "export BACKUP_RETENCAO_DIAS='${BACKUP_RETENCAO_DIAS:-30}'"
} > /etc/backup.env
chmod 600 /etc/backup.env

# O PATH do cron é mínimo (/usr/bin:/bin) e não inclui
# /usr/local/bin, onde mora o `mc`. Sem esta linha o job faria o dump
# e falharia no upload — silenciosamente, de madrugada.
#
# Saída redirecionada para o stdout do PID 1, para que os logs do job
# apareçam em `docker compose logs backup`.
{
  echo "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  echo "${AGENDA} . /etc/backup.env && /usr/local/bin/backup.sh > /proc/1/fd/1 2>/proc/1/fd/2"
} > /etc/cron.d/athlyt-backup
chmod 0644 /etc/cron.d/athlyt-backup
crontab /etc/cron.d/athlyt-backup

echo "[backup] agendado: ${AGENDA}"

# Backup imediato na subida, quando pedido: encurta o intervalo entre
# o primeiro deploy e a primeira cópia existir.
if [ "${BACKUP_AO_INICIAR:-false}" = "true" ]; then
  echo "[backup] executando backup inicial"
  . /etc/backup.env && /usr/local/bin/backup.sh || \
    echo "[backup] backup inicial falhou; o agendamento segue ativo" >&2
fi

exec cron -f
