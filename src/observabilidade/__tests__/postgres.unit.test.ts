import { afterEach, describe, expect, it, vi } from "vitest";
import type postgres from "postgres";
import { instrumentarPostgres } from "../postgres";

afterEach(() => { vi.unstubAllEnvs(); });
describe("fronteira postgres.js", () => {
  it("preserva a execução lazy e os resultados de values sem consumir duas vezes", async () => {
    vi.stubEnv("OBSERVABILITY_ENABLED", "true");
    let executions = 0;
    const query = {
      values() { return this; },
      then(resolve: (value: number[][]) => unknown) { executions++; return Promise.resolve([[1]]).then(resolve); },
    };
    const fake = { unsafe: vi.fn(() => query) } as unknown as postgres.Sql;
    const client = instrumentarPostgres(fake);
    const pending = client.unsafe("select $1", ["private"]);
    expect(executions).toBe(0);
    expect(await pending.values()).toEqual([[1]]);
    expect(executions).toBe(1);
  });
  it("não transforma exceções de banco e mantém opt-in desligado", () => {
    vi.stubEnv("OBSERVABILITY_ENABLED", "false");
    const client = { unsafe: vi.fn() } as unknown as postgres.Sql;
    expect(instrumentarPostgres(client)).toBe(client);
  });
});
