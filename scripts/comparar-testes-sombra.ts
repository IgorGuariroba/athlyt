import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const contagem = z.number().int().nonnegative();
const duracao = z.number().nonnegative();
const caminhos = z.array(z.string().min(1));
const planoSchema = z.object({
  modo: z.enum(["relacionados", "completo"]),
  testesSelecionados: caminhos.min(1),
  inventarioCompleto: caminhos.min(1),
  totalTestes: contagem.positive(),
  custoSeletorMs: duracao,
});
const temposSchema = z.object({
  completoMs: duracao,
  selecionadoMs: duracao,
  statusCompleto: contagem,
  statusSelecionado: contagem,
});
// Contrato do JsonReporter do Vitest 4: testResults contém arquivos;
// numTotalTestSuites também conta describes, portanto não é inventário de arquivos.
const vitestSchema = z.object({
  success: z.boolean(),
  numTotalTestSuites: contagem,
  numPassedTestSuites: contagem,
  numFailedTestSuites: contagem,
  numPendingTestSuites: contagem,
  numTotalTests: contagem,
  numPassedTests: contagem,
  numFailedTests: contagem,
  numPendingTests: contagem,
  numTodoTests: contagem,
  testResults: z.array(z.object({
    name: z.string().min(1),
    status: z.enum(["passed", "failed"]),
    message: z.string(),
    startTime: duracao,
    endTime: duracao,
    assertionResults: z.array(z.object({
      fullName: z.string(),
      title: z.string(),
      ancestorTitles: z.array(z.string()),
      status: z.enum(["passed", "failed", "skipped", "todo", "pending"]),
      failureMessages: z.array(z.string()),
    })),
  })),
});
type Execucao = z.infer<typeof vitestSchema>;

function mesmosArquivos(a: string[], b: string[]): boolean {
  return a.length === b.length && new Set(a).size === a.length && new Set(b).size === b.length
    && a.every((arquivo) => b.includes(arquivo));
}

function validarExecucao(execucao: Execucao, esperados: string[], status: number): string[] {
  const motivos: string[] = [];
  const arquivos = execucao.testResults;
  if (!mesmosArquivos(arquivos.map((arquivo) => arquivo.name), esperados)) {
    motivos.push("arquivos efetivamente executados diferem do plano/inventário (ausentes, extras ou duplicados)");
  }
  const casos = arquivos.flatMap((arquivo) => arquivo.assertionResults);
  const contar = (estado: string) => casos.filter((caso) => caso.status === estado).length;
  if (casos.length === 0 || casos.length !== execucao.numTotalTests
    || contar("passed") !== execucao.numPassedTests || contar("failed") !== execucao.numFailedTests
    || contar("skipped") !== execucao.numPendingTests || contar("todo") !== execucao.numTodoTests
    || contar("pending") > 0) {
    motivos.push("contagens de testes inconsistentes, zero testes ou execução parcial");
  }
  const falhas = arquivos.filter((arquivo) => arquivo.status === "failed").length;
  if (execucao.numTotalTestSuites < arquivos.length
    || execucao.numTotalTestSuites !== execucao.numPassedTestSuites + execucao.numFailedTestSuites + execucao.numPendingTestSuites
    || execucao.numFailedTestSuites < falhas || (falhas === 0 && execucao.numFailedTestSuites !== 0)) {
    motivos.push("contagens de suites inconsistentes");
  }
  for (const arquivo of arquivos) {
    const falhou = arquivo.assertionResults.some((caso) => caso.status === "failed");
    if (arquivo.assertionResults.length === 0 || arquivo.endTime < arquivo.startTime
      || (arquivo.status === "failed") !== falhou || arquivo.message !== ""
      || arquivo.assertionResults.some((caso) => (caso.status === "failed") !== (caso.failureMessages.length > 0))) {
      motivos.push(`resultado inconsistente ou erro de coleta/hook/infraestrutura: ${arquivo.name}`);
    }
  }
  const sucessoEsperado = falhas === 0 && execucao.numFailedTests === 0;
  if (execucao.success !== sucessoEsperado || status !== (sucessoEsperado ? 0 : 1)) {
    motivos.push("success, resultados e código de saída inconsistentes (possível erro de infraestrutura)");
  }
  return motivos;
}

export function compararSombra(planoJson: unknown, completoJson: unknown, selecionadoJson: unknown, temposJson: unknown) {
  const motivosInvalidade: string[] = [];
  const divergencias: string[] = [];
  const plano = planoSchema.safeParse(planoJson);
  const completo = vitestSchema.safeParse(completoJson);
  const selecionado = vitestSchema.safeParse(selecionadoJson);
  const tempos = temposSchema.safeParse(temposJson);
  for (const [nome, validacao] of [["plano", plano], ["completa", completo], ["selecionada", selecionado], ["tempos", tempos]] as const) {
    if (!validacao.success) motivosInvalidade.push(`${nome}: estrutura inválida: ${validacao.error.message}`);
  }
  let falhasCompletas: string[] = [];
  let falhasSelecionadas: string[] = [];
  let omitidas: string[] = [];
  if (plano.success && completo.success && selecionado.success && tempos.success) {
    const p = plano.data;
    if (!mesmosArquivos(p.inventarioCompleto, [...new Set(p.inventarioCompleto)])
      || p.totalTestes !== p.inventarioCompleto.length
      || new Set(p.testesSelecionados).size !== p.testesSelecionados.length
      || p.testesSelecionados.some((teste) => !p.inventarioCompleto.includes(teste))
      || (p.modo === "completo" && !mesmosArquivos(p.testesSelecionados, p.inventarioCompleto))) {
      motivosInvalidade.push("plano: seleção e inventário completo inconsistentes");
    }
    motivosInvalidade.push(...validarExecucao(completo.data, p.inventarioCompleto, tempos.data.statusCompleto).map((motivo) => `completa: ${motivo}`));
    motivosInvalidade.push(...validarExecucao(selecionado.data, p.testesSelecionados, tempos.data.statusSelecionado).map((motivo) => `selecionada: ${motivo}`));
    falhasCompletas = completo.data.testResults.filter((arquivo) => arquivo.status === "failed").map((arquivo) => arquivo.name);
    falhasSelecionadas = selecionado.data.testResults.filter((arquivo) => arquivo.status === "failed").map((arquivo) => arquivo.name);
    omitidas = falhasCompletas.filter((arquivo) => !p.testesSelecionados.includes(arquivo));
    if (omitidas.length > 0) divergencias.push("suíte completa encontrou falhas em testes omitidos");
    for (const arquivo of selecionado.data.testResults) {
      const referencia = completo.data.testResults.find((item) => item.name === arquivo.name);
      if (referencia === undefined) continue;
      const assinatura = (item: typeof arquivo) => item.assertionResults.map((caso) => JSON.stringify([caso.ancestorTitles, caso.title, caso.status])).sort();
      const nomes = (item: typeof arquivo) => item.assertionResults.map((caso) => JSON.stringify([caso.ancestorTitles, caso.title])).sort();
      if (JSON.stringify(nomes(arquivo)) !== JSON.stringify(nomes(referencia))) {
        motivosInvalidade.push(`casos executados diferem entre completa e selecionada: ${arquivo.name}`);
      } else if (JSON.stringify(assinatura(arquivo)) !== JSON.stringify(assinatura(referencia))) {
        divergencias.push(`resultados divergentes: ${arquivo.name}`);
      }
    }
  }
  const valido = motivosInvalidade.length === 0;
  // O JSON padrão não distingue assertion de beforeEach/afterEach com falha.
  // Ambos servem à comparação de segurança, mas não comprovam trabalho comparável
  // para medir economia: hooks podem impedir a execução dos corpos dos testes.
  const economiaDisponivel = valido && divergencias.length === 0 && tempos.success && plano.success
    && falhasCompletas.length === 0 && falhasSelecionadas.length === 0;
  return {
    valido,
    motivosInvalidade,
    divergencias,
    testesSelecionados: plano.success ? plano.data.testesSelecionados.length : null,
    testesTotais: plano.success ? plano.data.totalTestes : null,
    proporcaoSelecionada: plano.success ? plano.data.testesSelecionados.length / plano.data.totalTestes : null,
    custoSeletorMs: plano.success ? plano.data.custoSeletorMs : null,
    duracaoCompletaMs: tempos.success ? tempos.data.completoMs : null,
    duracaoSelecionadaMs: tempos.success ? tempos.data.selecionadoMs : null,
    economiaBrutaMs: economiaDisponivel ? tempos.data.completoMs - tempos.data.selecionadoMs : null,
    economiaLiquidaMs: economiaDisponivel ? tempos.data.completoMs - tempos.data.selecionadoMs - plano.data.custoSeletorMs : null,
    falhasExecucaoCompleta: falhasCompletas,
    falhasExecucaoSelecionada: falhasSelecionadas,
    falhasEmTestesOmitidos: omitidas,
  };
}

export function compararArquivosSombra(caminhosJson: string[]) {
  const erros: string[] = [];
  const valores = caminhosJson.map((caminho) => {
    try {
      return JSON.parse(readFileSync(caminho, "utf8")) as unknown;
    } catch (erro) {
      erros.push(`${caminho}: JSON ausente ou corrompido: ${erro instanceof Error ? erro.message : String(erro)}`);
      return undefined;
    }
  });
  const [plano, completo, selecionado, tempos] = valores;
  const resultado = compararSombra(plano, completo, selecionado, tempos);
  resultado.motivosInvalidade.push(...erros);
  return resultado;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const caminhosJson = process.argv.slice(2);
  if (caminhosJson.length !== 4) throw new Error("uso: tsx scripts/comparar-testes-sombra.ts <relatorio> <completo.json> <selecionado.json> <tempos.json>");
  const resultado = compararArquivosSombra(caminhosJson);
  console.log(JSON.stringify(resultado, null, 2));
  if (!resultado.valido || resultado.divergencias.length > 0) process.exitCode = 1;
}
