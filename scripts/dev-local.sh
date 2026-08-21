#!/usr/bin/env bash
#
# Ciclo de vida do ambiente de desenvolvimento completo.
#
#   npm run dev     banco + migrações + next dev (foreground)
#   npm run down    derruba TUDO: app em qualquer porta + banco
#
# Complementa scripts/app-local.sh, que cuida do modo produção local.
# Aqui o alvo é o `next dev`, que pode ter sido iniciado em qualquer
# porta (PORT=..., --port, fallback automático do Next quando a 3000
# está ocupada) — por isso o `down` procura por processo do projeto,
# não por porta fixa.

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
RAIZ="$PWD"

PORTA="${PORT:-3000}"

# PIDs de processos Node que pertencem a este projeto (cwd na raiz ou
# abaixo dela) e são servidores da aplicação — independente da porta.
# O standalone muda o cwd para .next/standalone; se um build apagar essa
# pasta enquanto ele roda, /proc ainda acrescenta o sufixo " (deleted)".
pids_do_projeto() {
  local pid cwd cmd
  for pid in $(pgrep -f 'next|\.next/standalone/server\.js' 2>/dev/null || true); do
    [ "$pid" = "$$" ] && continue
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    cwd="${cwd% (deleted)}"
    case "$cwd" in
      "$RAIZ"|"$RAIZ"/*) ;;
      *) continue ;;
    esac
    cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$cmd" in
      *dev-local.sh*|*app-local.sh*) continue ;;
    esac
    echo "$pid"
  done
}

derrubar_app() {
  local pids
  pids="$(pids_do_projeto | sort -u)"

  if [ -z "$pids" ]; then
    echo "[dev] nenhum processo da aplicação rodando"
  else
    echo "[dev] encerrando: $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    for _ in $(seq 1 25); do
      [ -z "$(pids_do_projeto)" ] && break
      sleep 0.4
    done
    pids="$(pids_do_projeto | sort -u)"
    if [ -n "$pids" ]; then
      echo "[dev] forçando encerramento: $pids"
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi

  # PID file do modo produção deixa de valer depois disto.
  rm -f .next/athlyt-app.pid
}

subir_banco() {
  echo "[dev] subindo o banco"
  docker compose -f docker/compose.yml up -d --wait
}

# drizzle-kit só tem o subcomando `migrate` a partir da 0.20. Um downgrade
# acidental em package.json (ou um node_modules defasado) faz o comando morrer
# com "unknown command 'migrate'", erro que não aponta para a causa. Falhamos
# antes, dizendo exatamente o que corrigir.
verificar_drizzle_kit() {
  local instalada esperada
  instalada=$(node -p "require('./node_modules/drizzle-kit/package.json').version" 2>/dev/null || echo "")
  esperada=$(node -p "require('./package.json').devDependencies['drizzle-kit']" 2>/dev/null || echo "")

  if [ -z "$instalada" ]; then
    echo "[dev] drizzle-kit não está instalado. Rode: npm ci" >&2
    exit 1
  fi

  local major minor
  major=${instalada%%.*}
  minor=${instalada#*.}
  minor=${minor%%.*}

  if [ "$major" -eq 0 ] && [ "$minor" -lt 20 ]; then
    echo "[dev] drizzle-kit $instalada não tem o subcomando 'migrate' (exige >= 0.20)." >&2
    echo "[dev] package.json pede '$esperada'. Se houve downgrade acidental, restaure:" >&2
    echo "[dev]   git checkout -- package.json package-lock.json && npm ci" >&2
    exit 1
  fi
}

migrar() {
  verificar_drizzle_kit
  echo "[dev] aplicando migrações"
  npm run db:migrate
}

criar_sessao_dev() {
  echo "[dev] preparando sessão local sem OAuth"
  npx tsx scripts/seed-dev-session.ts
}

subir() {
  derrubar_app
  subir_banco
  migrar
  criar_sessao_dev
  echo "[dev] iniciando next dev na porta ${PORTA}"
  # Sem teto explícito, o V8 dimensiona o old space pela RAM total da
  # máquina e o servidor de dev cresce monotonicamente (HMR retém
  # módulos server-side; 50+ rotas compiladas sob demanda). Já chegou a
  # 5,5 GB e derrubou a sessão de trabalho inteira por swap. Com teto,
  # o GC atua antes disso e um estouro vira OOM claro do Node em vez de
  # travar o sistema. Sobrescrevível via NODE_OPTIONS do ambiente.
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}" \
  AUTH_URL="http://localhost:${PORTA}" exec npx next dev --port "$PORTA"
}

derrubar() {
  derrubar_app
  echo "[dev] derrubando o banco"
  docker compose -f docker/compose.yml down
  # Observabilidade é opcional; só derruba se estiver de pé.
  if docker compose -f observability/compose.yml ps -q 2>/dev/null | grep -q .; then
    echo "[dev] derrubando observabilidade"
    docker compose -f observability/compose.yml down
  fi
  echo "[dev] tudo parado"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-up}" in
    up) subir ;;
    down) derrubar ;;
    *)
      echo "uso: $0 {up|down}" >&2
      exit 1
      ;;
  esac
fi
