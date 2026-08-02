import { describe, expect, it } from "vitest";
import { configuracaoR2, criarStorageR2 } from "../index";

describe("configuração R2", () => {
  it("só habilita o adapter quando todas as credenciais existem", () => {
    expect(configuracaoR2({ R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s", R2_BUCKET: "b" })).toEqual({ accountId: "a", accessKeyId: "k", secretAccessKey: "s", bucket: "b" });
    expect(configuracaoR2({ R2_ACCOUNT_ID: "a" })).toBeNull();
  });
  it("falha fechado sem configuração", () => {
    expect(() => criarStorageR2(null)).toThrow(/R2 não configurado/);
  });
});
