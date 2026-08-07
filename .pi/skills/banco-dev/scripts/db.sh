#!/usr/bin/env bash
#
# Acesso ao banco PostgreSQL de desenvolvimento do Athlyt.
#
# A conexão vem sempre de um pg_service (~/.pg_service.conf), nunca de
# uma URL em linha de comando: argumento de processo é visível em `ps`,
# no histórico do shell e nos logs do agente.
set -euo pipefail

SERVICE="${ATHLYT_PG_SERVICE:-athlyt-dev}"
CONF="${PGSERVICEFILE:-$HOME/.pg_service.conf}"
CONN="service=$SERVICE"

erro() { printf '\033[31merro:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m%s\033[0m\n' "$1"; }

exige_service() {
  [ -f "$CONF" ] || erro "$CONF não existe. Rode: $0 setup"
  grep -q "^\[$SERVICE\]" "$CONF" ||
    erro "seção [$SERVICE] ausente em $CONF. Rode: $0 setup"
}

# Bloqueia escrita disfarçada de leitura. Não é sandbox — é uma rede de
# proteção contra engano, para que `query` não altere dados sem querer.
exige_leitura() {
  if printf '%s' "$1" | grep -Eiq '(^|[[:space:];])(insert|update|delete|drop|truncate|alter|create|grant|revoke)[[:space:]]'; then
    erro "isto altera dados; use: $0 write \"...\""
  fi
}

cmd="${1:-help}"
[ $# -gt 0 ] && shift || true

case "$cmd" in
  setup)
    if [ -f "$CONF" ] && grep -q "^\[$SERVICE\]" "$CONF"; then
      info "[$SERVICE] já existe em $CONF"
      info "Edite com: \${EDITOR:-nano} $CONF"
      exit 0
    fi
    cat >> "$CONF" <<EOF
[$SERVICE]
host=
port=5432
dbname=
user=
password=
sslmode=require
EOF
    chmod 600 "$CONF"
    info "Modelo [$SERVICE] criado em $CONF (permissão 600)."
    info "Preencha os valores e valide com: $0 check"
    ;;

  check)
    exige_service
    info "Testando conexão com service=$SERVICE ..."
    psql "$CONN" -Atc 'SELECT current_database(), current_user, version()' |
      tr '|' '\n'
    info "OK"
    ;;

  tables)
    exige_service
    psql "$CONN" -c '\dt'
    ;;

  schema)
    exige_service
    [ $# -ge 1 ] || erro "uso: $0 schema <tabela>"
    psql "$CONN" -c "\\d \"$1\""
    ;;

  query)
    exige_service
    [ $# -ge 1 ] || erro "uso: $0 query \"SELECT ...\""
    exige_leitura "$1"
    psql "$CONN" -c "$1"
    ;;

  write)
    exige_service
    [ $# -ge 1 ] || erro "uso: $0 write \"INSERT ...\""
    printf '\033[33mSQL de escrita:\033[0m %s\n' "$1"
    printf 'Confirma? [s/N] '
    read -r resposta
    case "$resposta" in
      s|S|sim|SIM) psql "$CONN" -c "$1" ;;
      *) erro "cancelado" ;;
    esac
    ;;

  psql)
    exige_service
    psql "$CONN" "$@"
    ;;

  help|--help|-h)
    cat <<EOF
Banco de desenvolvimento do Athlyt (PostgreSQL via psql)

  $0 setup              cria o modelo de credenciais em ~/.pg_service.conf
  $0 check              testa a conexão
  $0 tables             lista as tabelas
  $0 schema <tabela>    descreve uma tabela
  $0 query "SELECT ..." executa SQL de leitura
  $0 write "INSERT ..." executa SQL de escrita (pede confirmação)
  $0 psql [args]        sessão psql interativa

Service usado: $SERVICE   (sobrescreva com ATHLYT_PG_SERVICE)
Credenciais:   $CONF
EOF
    ;;

  *)
    erro "comando desconhecido: $cmd (veja: $0 help)"
    ;;
esac
