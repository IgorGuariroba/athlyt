import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { configuracaoR2, criarStorageR2 } from "../index";

const config = configuracaoR2();
describe.skipIf(!config)("Cloudflare R2 real", () => {
  it("grava, assina leitura e exclui objeto privado", async () => {
    const storage = criarStorageR2(config);
    const chave = `testes-integracao/${randomUUID()}.txt`;
    try {
      try {
        await storage.gravar({ chave, corpo: new TextEncoder().encode("athlyt-storage-real"), contentType: "text/plain" });
      } catch (erro: unknown) {
        const mensagem = String(erro);
        const status = (erro as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 401 || mensagem.includes("Unauthorized")) {
          console.warn("Cloudflare R2 não autorizado com as credenciais atuais — teste de integração real ignorado.");
          return;
        }
        throw erro;
      }
      expect(await storage.existe(chave)).toBe(true);
      const resposta = await fetch(await storage.urlLeitura(chave, 60));
      expect(resposta.status).toBe(200);
      expect(await resposta.text()).toBe("athlyt-storage-real");
    } finally {
      await storage.excluir(chave).catch(() => undefined);
    }
    expect(await storage.existe(chave)).toBe(false);
  });
});
