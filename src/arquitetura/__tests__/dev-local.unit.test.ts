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
