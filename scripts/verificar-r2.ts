import { randomUUID } from "node:crypto";
import { config } from "dotenv";

async function verificar() {
  config({ path: ".env" });
  const { criarStorageR2 } = await import("../src/infra/storage/index");
  const storage = criarStorageR2();
  const chave = `verificacoes/${randomUUID()}.txt`;
  try {
    await storage.gravar({ chave, corpo: new TextEncoder().encode("athlyt-r2-ok"), contentType: "text/plain" });
    if (!await storage.existe(chave)) throw new Error("Objeto não encontrado após upload.");
    const resposta = await fetch(await storage.urlLeitura(chave, 60));
    if (!resposta.ok || await resposta.text() !== "athlyt-r2-ok") throw new Error("URL assinada não devolveu o conteúdo esperado.");
    console.log("R2 validado: upload privado, leitura assinada e exclusão funcionam.");
  } finally {
    await storage.excluir(chave);
  }
}

verificar().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
