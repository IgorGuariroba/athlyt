import { criarStorageR2 } from "../src/infra/storage";
import { excluirFotosProgresso, listarFotosExpiradas } from "../src/domain/medicoes/repositorio";

async function main() {
  const expiradas = await listarFotosExpiradas(); const storage = criarStorageR2();
  const removidas = new Map<string, string[]>(); let falhas = 0;
  for (const foto of expiradas) {
    try {
      await storage.excluir(foto.objectKey);
      removidas.set(foto.userId, [...(removidas.get(foto.userId) ?? []), foto.id]);
    } catch { falhas += 1; }
  }
  for (const [userId, ids] of removidas) await excluirFotosProgresso(userId, ids);
  console.log(`Retenção aplicada: ${[...removidas.values()].flat().length} fotos removidas; ${falhas} falhas preservadas para nova tentativa.`);
  if (falhas) process.exitCode = 1;
}
main().catch((erro) => { console.error(erro); process.exitCode = 1; });
