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

# Aviso quando o cache de dev passa do ponto em que convém limpar.
# O acúmulo em disco é o termômetro barato do grafo residente em
# memória, mas só aparece para quem vai medir — o alerta transforma a
# métrica em rotina (docs/memory/servidor-de-dev-sem-teto-de-heap.md).
conferir_cache() {
  local kb limite_kb
  [ -d .next/dev ] || return 0
  kb=$(du -sk .next/dev 2>/dev/null | cut -f1) || return 0
  limite_kb=$(( ${ATHLYT_CACHE_ALERTA_MB:-1024} * 1024 ))
  if [ "$kb" -gt "$limite_kb" ]; then
    echo "[dev] .next/dev está com $(( kb / 1024 )) MB — considere 'rm -rf .next/dev'"
  fi
}

# O `next dev` cresce por construção: o HMR retém módulos server-side e
# cada uma das 55+ rotas retém grafo e source maps ao ser compilada sob
# demanda. Já chegou a 5,5 GB e derrubou a sessão de trabalho por swap.
#
# `--max-old-space-size` sozinho não contém isso. Desde que o dev passou
# a rodar com Turbopack (`turbopack: {}` em next.config.ts), o grafo vive
# em memória nativa via N-API, fora do heap do V8: medimos 4,4 GB de RSS
# anônimo com o teto de 2 GB ativo e não violado. O teto de heap seguia
# aparentando proteger enquanto a máquina ia para o swap.
#
# Por isso o limite real é de cgroup, que vale para o heap do V8, para a
# arena do Turbopack e para qualquer motor que venha depois. `MemoryHigh`
# aplica pressão de recuperação antes do corte; `MemoryMax` mata. E
# `MemorySwapMax=0` é o que preserva a sessão: é o swap, não o tamanho do
# processo, que trava a máquina inteira. Estouro vira OOM nomeado.
#
# Sobrescrevível: ATHLYT_MEM_MAX / ATHLYT_MEM_HIGH / NODE_OPTIONS.
iniciar_next() {
  local mem_max="${ATHLYT_MEM_MAX:-4G}"
  local mem_high="${ATHLYT_MEM_HIGH:-3G}"

  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
  export AUTH_URL="http://localhost:${PORTA}"

  # systemd de usuário com controlador `memory` delegado é o caso comum
  # em desktop Linux, mas não é universal (WSL sem systemd, containers).
  # Onde não houver, seguimos sem o teto em vez de impedir o dev.
  if command -v systemd-run >/dev/null 2>&1 &&
     systemd-run --user --scope -q -p MemoryMax=64M true >/dev/null 2>&1; then
    echo "[dev] teto de memória: ${mem_max} (alerta em ${mem_high}, sem swap)"
    exec systemd-run --user --scope -q --unit="athlyt-dev-$$" \
      -p MemoryMax="$mem_max" -p MemoryHigh="$mem_high" -p MemorySwapMax=0 \
      -- npx next dev --port "$PORTA"
  fi

  echo "[dev] aviso: systemd-run indisponível, sem teto de memória do processo" >&2
  exec npx next dev --port "$PORTA"
}

subir() {
  derrubar_app
  subir_banco
  migrar
  criar_sessao_dev
  conferir_cache
  echo "[dev] iniciando next dev na porta ${PORTA}"
  iniciar_next
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
