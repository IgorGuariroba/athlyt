import { describe, expect, it, vi } from "vitest";
import { ACCESS_DENIED_ROUTE, buildAuthConfig } from "../config";

/**
 * Seam: o callback signIn do Auth.js, isolado da allowlist real via
 * injeção de `loadAllowlist`. Confirma a fronteira de acesso sem tocar
 * o banco:
 * e-mail permitido entra, e-mail fora da allowlist é redirecionado
 * para a tela de acesso restrito sem qualquer persistência.
 */
describe("callback signIn (fronteira de allowlist)", () => {
  it("autoriza um e-mail presente na allowlist", async () => {
    const loadAllowlist = vi.fn().mockResolvedValue(["igor@example.com"]);
    const config = buildAuthConfig(loadAllowlist);

    const result = await config.callbacks!.signIn!({
      user: { email: "igor@example.com" },
    } as Parameters<NonNullable<NonNullable<typeof config.callbacks>["signIn"]>>[0]);

    expect(result).toBe(true);
    expect(loadAllowlist).toHaveBeenCalledOnce();
  });

  it("redireciona para acesso restrito quando o e-mail não está na allowlist", async () => {
    const loadAllowlist = vi.fn().mockResolvedValue(["igor@example.com"]);
    const config = buildAuthConfig(loadAllowlist);

    const result = await config.callbacks!.signIn!({
      user: { email: "estranho@example.com" },
    } as Parameters<NonNullable<NonNullable<typeof config.callbacks>["signIn"]>>[0]);

    expect(result).toBe(
      `${ACCESS_DENIED_ROUTE}?email=estranho%40example.com`,
    );
  });

  it("nunca chama a adapter/persistência quando nega o acesso", async () => {
    // A garantia de que nada é persistido vem do próprio Auth.js: uma
    // string de retorno cancela o fluxo antes do adapter ser chamado
    // (documentado em authjs.dev/reference/core/configuration/callbacks#signin).
    // Este teste fixa o contrato do nosso lado: negar sempre retorna
    // uma string de redirect, nunca `false` silencioso nem `true`.
    const loadAllowlist = vi.fn().mockResolvedValue([]);
    const config = buildAuthConfig(loadAllowlist);

    const result = await config.callbacks!.signIn!({
      user: { email: "qualquer@example.com" },
    } as Parameters<NonNullable<NonNullable<typeof config.callbacks>["signIn"]>>[0]);

    expect(typeof result).toBe("string");
    expect(result).toContain(ACCESS_DENIED_ROUTE);
  });
});
