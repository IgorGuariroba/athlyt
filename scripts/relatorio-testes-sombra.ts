import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsearArgumentosSombra } from "./argumentos-testes-sombra";
import { listarTestes, planejarSelecao } from "./seletor-testes";

export function gerarRelatorioSombra(base: string, head: string) {
  const inicio = performance.now();
  const plano = planejarSelecao(base, head);
  let inventarioCompleto: string[] | null = null;
  let erroInventario: string | null = null;
  try {
    inventarioCompleto = listarTestes();
    if (inventarioCompleto.length === 0) throw new Error("inventário completo vazio");
    if (plano.testesSelecionados?.some((teste) => !inventarioCompleto?.includes(teste))) {
      throw new Error("seleção contém arquivo fora do inventário completo");
    }
  } catch (erro) {
    erroInventario = erro instanceof Error ? erro.message : String(erro);
    inventarioCompleto = null;
    plano.modo = "completo";
    plano.motivo += `; inventário indisponível: ${erroInventario}`;
    plano.testesSelecionados = null;
  }
  return {
    ...plano,
    testesSelecionados: plano.testesSelecionados ?? inventarioCompleto ?? [],
    inventarioCompleto,
    erroInventario,
    totalTestes: inventarioCompleto?.length ?? null,
    custoSeletorMs: Math.round(performance.now() - inicio),
  };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { base, head, output } = parsearArgumentosSombra(process.argv.slice(2));
  const relatorio = gerarRelatorioSombra(base, head);
  writeFileSync(output, `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(JSON.stringify(relatorio));
}
