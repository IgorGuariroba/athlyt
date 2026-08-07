#!/usr/bin/env bash
#
# Gera a seção [athlyt-dev] em ~/.pg_service.conf a partir do
# DATABASE_URL do .env do projeto.
#
# Roda uma vez, pelo usuário. Nada é impresso na tela além do host e do
# banco: a senha vai direto do .env para o arquivo de service, com
# permissão 600, sem passar por stdout nem pelo histórico do shell.
set -euo pipefail

SERVICE="${ATHLYT_PG_SERVICE:-athlyt-dev}"
CONF="${PGSERVICEFILE:-$HOME/.pg_service.conf}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ARQUIVO_ENV="$RAIZ/.env"

erro() { printf '\033[31merro:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m%s\033[0m\n' "$1"; }

[ -f "$ARQUIVO_ENV" ] || erro "$ARQUIVO_ENV não encontrado"

url="$(grep -m1 '^DATABASE_URL=' "$ARQUIVO_ENV" | cut -d= -f2- | tr -d '"'"'"'')"
[ -n "$url" ] || erro "DATABASE_URL ausente em $ARQUIVO_ENV"

# postgres://usuario:senha@host:porta/banco?params
resto="${url#*://}"
credenciais="${resto%%@*}"
servidor="${resto#*@}"

usuario="${credenciais%%:*}"
senha="${credenciais#*:}"
[ "$senha" = "$credenciais" ] && senha=""

hostporta="${servidor%%/*}"
caminho="${servidor#*/}"
banco="${caminho%%\?*}"
parametros="${caminho#*\?}"
[ "$parametros" = "$caminho" ] && parametros=""

host="${hostporta%%:*}"
porta="${hostporta#*:}"
[ "$porta" = "$host" ] && porta=5432

# Bancos gerenciados exigem TLS; Postgres local normalmente não o oferece.
if printf '%s' "$parametros" | grep -q 'sslmode='; then
  ssl="$(printf '%s' "$parametros" | sed -n 's/.*sslmode=\([^&]*\).*/\1/p')"
elif [ "$host" = "localhost" ] || [ "$host" = "127.0.0.1" ]; then
  ssl="disable"
else
  ssl="require"
fi

# Decodifica %XX em usuário e senha (URLs percent-encoded).
decodifica() { printf '%b' "${1//%/\\x}"; }
usuario="$(decodifica "$usuario")"
senha="$(decodifica "$senha")"

[ -f "$CONF" ] && grep -q "^\[$SERVICE\]" "$CONF" &&
  erro "[$SERVICE] já existe em $CONF — remova a seção antes de reimportar"

umask 077
{
  printf '[%s]\n' "$SERVICE"
  printf 'host=%s\n' "$host"
  printf 'port=%s\n' "$porta"
  printf 'dbname=%s\n' "$banco"
  printf 'user=%s\n' "$usuario"
  [ -n "$senha" ] && printf 'password=%s\n' "$senha"
  printf 'sslmode=%s\n' "$ssl"
} >> "$CONF"
chmod 600 "$CONF"

info "Service [$SERVICE] gravado em $CONF"
printf '  host=%s  dbname=%s  user=%s  sslmode=%s\n' \
  "$host" "$banco" "$usuario" "$ssl"
info "Valide com: $(dirname "$0")/db.sh check"
