import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { configuracaoR2, criarStorageR2 } from "../index";

const config = configuracaoR2();
describe.skipIf(!config)("Cloudflare R2 real", () => {
  it("grava, assina leitura e exclui objeto privado", async () => {
    const storage = criarStorageR2(config);
    const chave = `testes-integracao/${randomUUID()}.txt`;
    try {
      await storage.gravar({ chave, corpo: new TextEncoder().encode("athlyt-storage-real"), contentType: "text/plain" });
      expect(await storage.existe(chave)).toBe(true);
      const resposta = await fetch(await storage.urlLeitura(chave, 60));
      expect(resposta.status).toBe(200);
      expect(await resposta.text()).toBe("athlyt-storage-real");
    } finally {
      await storage.excluir(chave);
    }
    expect(await storage.existe(chave)).toBe(false);
  });
});
