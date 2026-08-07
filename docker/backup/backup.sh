#!/usr/bin/env bash
#
# Dump do Postgres para o bucket S3/R2, com expurgo dos antigos.
#
# Roda por cron dentro do container `backup` e também sob demanda:
#   docker compose -f docker/compose.prod.yml exec backup backup.sh

# pipefail é essencial: sem ele, um pg_dump que falhasse no meio de
# `pg_dump | gzip` ainda produziria um .sql.gz válido, porém truncado,
# e o backup seria dado como bem-sucedido.
set -Eeuo pipefail

exigir() {
  if [ -z "${!1:-}" ]; then
    echo "[backup] ERRO: variável $1 não definida." >&2
    exit 1
  fi
}

exigir POSTGRES_USER
exigir POSTGRES_DB
exigir PGPASSWORD
exigir BACKUP_S3_BUCKET

RETENCAO_DIAS="${BACKUP_RETENCAO_DIAS:-30}"
PREFIXO="${BACKUP_S3_PREFIXO:-athlyt/postgres}"
HOST="${POSTGRES_HOST:-db}"

carimbo="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
arquivo="athlyt-${POSTGRES_DB}-${carimbo}.sql.gz"
destino="/tmp/${arquivo}"

# Remove o dump local em qualquer saída: o volume do container não
# deve acumular cópias, e um dump é dado sensível.
limpar() { rm -f "$destino"; }
trap limpar EXIT

echo "[backup] iniciando dump de ${POSTGRES_DB}@${HOST}"

# --clean --if-exists tornam o dump restaurável sobre um banco já
# povoado, que é o caso de uma restauração de emergência.
pg_dump \
  --host="$HOST" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip -9 > "$destino"

tamanho="$(stat -c %s "$destino")"

# Um dump vazio ou minúsculo indica falha silenciosa; melhor abortar
# alto do que publicar um arquivo inútil por cima dos bons.
if [ "$tamanho" -lt 1024 ]; then
  echo "[backup] ERRO: dump com apenas ${tamanho} bytes; abortando." >&2
  exit 1
fi

echo "[backup] dump gerado (${tamanho} bytes); enviando ao bucket"

mc alias set destino \
  "$BACKUP_S3_ENDPOINT" \
  "$BACKUP_S3_ACCESS_KEY_ID" \
  "$BACKUP_S3_SECRET_ACCESS_KEY" \
  --api S3v4 >/dev/null

mc cp "$destino" "destino/${BACKUP_S3_BUCKET}/${PREFIXO}/${arquivo}"

echo "[backup] enviado: ${PREFIXO}/${arquivo}"

# O expurgo roda depois do envio: se o upload falhar, o script já
# terminou por `set -e` e nenhum backup antigo é removido — nunca se
# fica sem cópia por causa de uma falha de rede.
echo "[backup] expurgando cópias com mais de ${RETENCAO_DIAS} dias"
mc rm --recursive --force \
  --older-than "${RETENCAO_DIAS}d" \
  "destino/${BACKUP_S3_BUCKET}/${PREFIXO}/" || true

echo "[backup] concluído"
