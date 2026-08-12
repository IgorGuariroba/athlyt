#!/usr/bin/env bash
# Mede o tempo de `npm run test:e2e` sob variantes de configuração, em
# condições comparáveis: mesmo banco, mesma suíte, servidor sempre frio
# (o CI nunca reaproveita um servidor quente) e `.next` limpo entre
# variantes, para que ninguém herde a compilação da anterior.
#
# Uso: scripts/medir-e2e.sh <nome-da-variante>
set -euo pipefail

VARIANTE="${1:?informe a variante}"
PORTA="${PORTA:-3210}"
export PLAYWRIGHT_BASE_URL="http://localhost:${PORTA}"
export AUTH_URL="$PLAYWRIGHT_BASE_URL"
export DATABASE_URL="${DATABASE_URL:-postgres://athlyt:devpassword@localhost:5433/athlyt}"
export AUTH_SECRET="${AUTH_SECRET:-medicao-e2e}"
export IA_AMBIENTE=desenvolvimento

limpar() {
  pkill -f "next dev -p ${PORTA}" 2>/dev/null || true
  pkill -f "next start -p ${PORTA}" 2>/dev/null || true
  pkill -f "standalone/server.js" 2>/dev/null || true
  sleep 1
}
trap limpar EXIT
limpar
rm -rf .next

inicio=$(date +%s)
case "$VARIANTE" in
  baseline)
    # Como o CI está hoje: dev server, 1 worker, vídeo sempre.
    ;;
  producao)
    # Compila antes e serve o build; o cronômetro inclui o build,
    # porque no CI alguém paga por ele.
    npm run build >/tmp/medir-build.log 2>&1
    export E2E_COMANDO="npx next start -p ${PORTA}"
    ;;
  paralelo)
    # Só paralelismo, ainda em dev: isola o efeito dos workers do
    # efeito de trocar o servidor.
    export E2E_WORKERS=4
    ;;
  producao-paralelo)
    npm run build >/tmp/medir-build.log 2>&1
    export E2E_COMANDO="npx next start -p ${PORTA}"
    export E2E_WORKERS=4
    ;;
  producao-sem-build)
    # Build tratado como artefato reaproveitado do job `build`: mede só
    # a execução, que é o que sobra no job de E2E.
    npm run build >/tmp/medir-build.log 2>&1
    export E2E_COMANDO="npx next start -p ${PORTA}"
    inicio=$(date +%s)
    ;;
esac

npx playwright test 2>&1 | tail -6
fim=$(date +%s)
echo "VARIANTE=${VARIANTE} SEGUNDOS=$((fim - inicio))"
