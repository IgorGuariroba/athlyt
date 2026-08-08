#!/usr/bin/env bash
#
# Ciclo de vida do app em modo produção na máquina local — a mesma
# instância servida pelo Tailscale Funnel na porta 3000.
#
#   npm run app:up      banco + build limpo + sobe + espera responder
#   npm run app:down    derruba app e banco (simétrico ao up)
#   npm run app:status   estado atual
#   npm run app:logs     acompanha o log
#
# Existe porque a sequência correta tem armadilhas que já custaram
# sessões de depuração (docs/memory/rebuild-restart-apos-mudanca.md):
# build incremental servindo chunk antigo, e processo iniciado pelo
# agente morrendo junto com a sessão do comando.

set -Eeuo pipefail

cd "$(dirname "$0")/.."

PORTA="${PORT:-3000}"
LOG="${ATHLYT_LOG:-/tmp/athlyt-app.log}"
PID_FILE=".next/athlyt-app.pid"
SERVIDOR=".next/standalone/server.js"

pid_ativo() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null || return 1
  echo "$pid"
}

derrubar() {
  local encontrado=0

  local pid
  if pid="$(pid_ativo)"; then
    echo "[app] encerrando processo $pid"
    kill "$pid" 2>/dev/null || true
    encontrado=1
  fi

  # Rede de segurança: um processo iniciado à mão (fora deste script)
  # não tem PID file, mas ocupa a porta e faria o `up` seguinte falhar.
  local ocupantes
  ocupantes="$(ss -ltnp 2>/dev/null | grep ":${PORTA} " | grep -oP 'pid=\K[0-9]+' | sort -u || true)"
  for outro in $ocupantes; do
    echo "[app] encerrando processo $outro (porta ${PORTA})"
    kill "$outro" 2>/dev/null || true
    encontrado=1
  done

  rm -f "$PID_FILE"

  if [ "$encontrado" -eq 0 ]; then
    echo "[app] nada rodando na porta ${PORTA}"
    return 0
  fi

  # Espera a porta liberar antes de devolver o controle: sem isso, um
  # `app:up` imediatamente após o `down` esbarraria em EADDRINUSE.
  for _ in $(seq 1 25); do
    ss -ltn 2>/dev/null | grep -q ":${PORTA} " || { echo "[app] parado"; return 0; }
    sleep 0.4
  done

  echo "[app] forçando encerramento"
  ss -ltnp 2>/dev/null | grep ":${PORTA} " | grep -oP 'pid=\K[0-9]+' | sort -u \
    | xargs -r kill -9 2>/dev/null || true
  sleep 1
  echo "[app] parado"
}

subir() {
  derrubar

  echo "[app] build de produção (.next limpo)"
  # O build incremental já reaproveitou o chunk antigo de uma rota e
  # serviu a versão anterior depois de um `next build` bem-sucedido.
  rm -rf .next
  npm run build

  # O `output: "standalone"` do next.config.ts torna `next start`
  # inválido; o servidor gerado é o canônico, e é o mesmo comando que
  # a imagem Docker executa.
  if [ ! -f "$SERVIDOR" ]; then
    echo "[app] ERRO: $SERVIDOR não foi gerado pelo build." >&2
    exit 1
  fi

  # O standalone não copia estáticos: sem isto a página abre sem CSS
  # nem JS. O Dockerfile faz o equivalente com COPY.
  mkdir -p .next/standalone/.next
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public

  echo "[app] iniciando na porta ${PORTA}"
  # `setsid` desacopla o processo da sessão do shell que o iniciou;
  # sem ele, o app morre junto com o comando do agente.
  PORT="$PORTA" HOSTNAME=0.0.0.0 setsid nohup node "$SERVIDOR" \
    > "$LOG" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"

  for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "http://127.0.0.1:${PORTA}/api/saude"; then
      echo "[app] no ar: http://localhost:${PORTA}"
      estado_publico
      return 0
    fi
    sleep 0.5
  done

  echo "[app] ERRO: não respondeu em 20s. Últimas linhas do log:" >&2
  tail -20 "$LOG" >&2
  exit 1
}

derrubar_banco() {
  # Simetria com o `up`, que sobe o banco antes do build: sem isto o
  # Postgres fica pendurado sem app depois de um `down`.
  echo "[app] derrubando o banco"
  docker compose -f docker/compose.yml down
}

estado_publico() {
  # A URL do Funnel é o que se usa no celular; mostrá-la evita ter de
  # consultar `tailscale serve status` à parte.
  local url
  url="$(tailscale serve status 2>/dev/null | grep -oE 'https://[^ ]+\.ts\.net' | head -1 || true)"
  [ -n "$url" ] && echo "[app] público (Funnel): $url"
}

estado() {
  local pid
  if pid="$(pid_ativo)"; then
    echo "[app] rodando (pid $pid, porta ${PORTA})"
  elif ss -ltn 2>/dev/null | grep -q ":${PORTA} "; then
    echo "[app] porta ${PORTA} ocupada por processo externo a este script"
  else
    echo "[app] parado"
    return 1
  fi
  curl -sf "http://127.0.0.1:${PORTA}/api/saude" 2>/dev/null \
    && echo "" || echo "[app] /api/saude não respondeu"
  estado_publico
}

case "${1:-}" in
  up) subir ;;
  down) derrubar; derrubar_banco ;;
  down-app) derrubar ;;
  status) estado ;;
  logs) tail -f "$LOG" ;;
  *)
    echo "uso: $0 {up|down|down-app|status|logs}" >&2
    exit 1
    ;;
esac
