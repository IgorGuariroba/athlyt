#!/usr/bin/env bash
#
# Inicia o Storybook sem deixar uma instância anterior do Athlyt ocupando a
# porta ou servindo uma configuração antiga. O filtro combina cwd do projeto
# com o executável local do Storybook: não toca em Storybooks de outros
# projetos nem em processos Node sem relação.

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
RAIZ="$PWD"
PORTA="${STORYBOOK_PORT:-6006}"

pids_do_storybook() {
  local pid cwd cmd
  for pid in $(pgrep -f 'node_modules/\.bin/storybook' 2>/dev/null || true); do
    [ "$pid" = "$$" ] && continue
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    cwd="${cwd% (deleted)}"
    case "$cwd" in
      "$RAIZ"|"$RAIZ"/*) ;;
      *) continue ;;
    esac
    cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$cmd" in
      *storybook*) echo "$pid" ;;
    esac
  done
}

encerrar_instancias_anteriores() {
  local pids
  pids="$(pids_do_storybook | sort -u)"
  if [ -z "$pids" ]; then
    return
  fi

  echo "[storybook] encerrando instâncias anteriores: $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true

  for _ in $(seq 1 25); do
    [ -z "$(pids_do_storybook)" ] && return
    sleep 0.2
  done

  pids="$(pids_do_storybook | sort -u)"
  if [ -n "$pids" ]; then
    echo "[storybook] forçando encerramento: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

encerrar_instancias_anteriores
echo "[storybook] iniciando na porta $PORTA"
exec npx storybook dev -p "$PORTA" "$@"
