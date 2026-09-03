import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("dev-local", () => {
  it("reconhece um next-server com cwd removido dentro do projeto", () => {
    const pid = execFileSync(
      "bash",
      [
        "-c",
        `
          set -Eeuo pipefail
          source scripts/dev-local.sh
          fixture="$RAIZ/.next/cwd-removido-$$"
          mkdir -p "$fixture"
          (cd "$fixture" && exec -a next-server sleep 30) &
          servidor=$!
          trap 'kill "$servidor" 2>/dev/null || true' EXIT
          # o subshell roda em background: só remova o diretório depois que
          # ele de fato entrou nele, senão o cd falha e o teste fica flaky
          for _ in $(seq 1 100); do
            [ "$(readlink -f "/proc/$servidor/cwd" 2>/dev/null)" = "$fixture" ] && break
            sleep 0.05
          done
          rmdir "$fixture"
          sleep 0.1
          pids_do_projeto | grep -Fx "$servidor"
        `,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    ).trim();

    expect(pid).toMatch(/^\d+$/);
  });
});
