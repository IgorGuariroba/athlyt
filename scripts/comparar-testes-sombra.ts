import { readFileSync } from "node:fs";

interface Relatorio {
  testesSelecionados: string[];
  totalTestes: number;
  custoSeletorMs: number;
}

interface Tempos {
  completoMs: number;
  selecionadoMs: number;
}

function lerJson(caminho: string): unknown {
  return JSON.parse(readFileSync(caminho, "utf8"));
}
function arquivosComFalha(valor: unknown, resultado: Set<string> = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) {
    for (const item of valor) arquivosComFalha(item, resultado);
    return resultado;
  }
  if (typeof valor !== "object" || valor === null) return resultado;
  const registro = valor as Record<string, unknown>;
  if (registro.status === "failed") {
    const arquivo = registro.testFilePath ?? registro.file ?? registro.name;
    if (typeof arquivo === "string") resultado.add(arquivo);
  }
  for (const filho of Object.values(registro)) arquivosComFalha(filho, resultado);
  return resultado;
}

const [relatorioPath, completoPath, selecionadoPath, temposPath] = process.argv.slice(2);
if (relatorioPath === undefined || completoPath === undefined || selecionadoPath === undefined || temposPath === undefined) {
  throw new Error("uso: tsx scripts/comparar-testes-sombra.ts <relatorio> <completo.json> <selecionado.json> <tempos.json>");
}
const relatorio = lerJson(relatorioPath) as Relatorio;
const tempos = lerJson(temposPath) as Tempos;
const falhasCompletas = arquivosComFalha(lerJson(completoPath));
const falhasSelecionadas = arquivosComFalha(lerJson(selecionadoPath));
const selecionados = new Set(relatorio.testesSelecionados);
const omitidas = [...falhasCompletas].filter((arquivo) => ![...selecionados].some((teste) => arquivo.endsWith(teste) || teste.endsWith(arquivo)));
const resultado = {
  testesSelecionados: relatorio.testesSelecionados.length,
  testesTotais: relatorio.totalTestes,
  proporcaoSelecionada: relatorio.totalTestes === 0 ? 0 : relatorio.testesSelecionados.length / relatorio.totalTestes,
  custoSeletorMs: relatorio.custoSeletorMs,
  duracaoCompletaMs: tempos.completoMs,
  duracaoSelecionadaMs: tempos.selecionadoMs,
  economiaBrutaMs: tempos.completoMs - tempos.selecionadoMs,
  falhasExecucaoCompleta: [...falhasCompletas],
  falhasExecucaoSelecionada: [...falhasSelecionadas],
  falhasEmTestesOmitidos: omitidas,
};
console.log(JSON.stringify(resultado, null, 2));
if (omitidas.length > 0) process.exitCode = 1;
