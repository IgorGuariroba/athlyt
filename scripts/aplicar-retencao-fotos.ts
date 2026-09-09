import "./carregar-env";
import { aplicarRetencaoFotos } from "../src/domain/medicoes/fotos";

async function main() {
  const resultado = await aplicarRetencaoFotos();
  console.log(`Retenção aplicada: ${resultado.concluidas.length} fotos removidas; ${resultado.pendentes.length + resultado.falhas.length} falhas preservadas para nova tentativa.`);
  if (resultado.pendentes.length || resultado.falhas.length) process.exitCode = 1;
}
main().catch((erro: unknown) => { console.error(erro); process.exitCode = 1; });
