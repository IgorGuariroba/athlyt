import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export function executarTestesSombra(plano: unknown): number {
  const { modo, testesSelecionados } = z.object({
    modo: z.enum(["completo", "relacionados"]),
    testesSelecionados: z.array(z.string().min(1)),
  }).parse(plano);
  if (modo === "relacionados" && testesSelecionados.length === 0) throw new Error("seleção vazia");
  const resultado = spawnSync("npm", [
    "exec", "--", "vitest", "run", "--project", "unidade",
    "--reporter=json", "--outputFile=unitarios-selecionados.json",
    ...(modo === "completo" ? [] : testesSelecionados),
  ], { stdio: "inherit" });
  if (resultado.error !== undefined) throw resultado.error;
  return resultado.status ?? 2;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const caminho = process.argv[2];
  if (caminho === undefined) throw new Error("uso: tsx scripts/executar-testes-sombra.ts <plano.json>");
  const plano: unknown = JSON.parse(readFileSync(caminho, "utf8"));
  process.exitCode = executarTestesSombra(plano);
}
