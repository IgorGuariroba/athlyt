import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compararArquivosSombra, compararSombra } from "../../../scripts/comparar-testes-sombra";

const a = "/repo/a.unit.test.ts";
const b = "/repo/b.unit.test.ts";
const plano = { modo: "relacionados", testesSelecionados: [a], inventarioCompleto: [a, b], totalTestes: 2, custoSeletorMs: 120 };
const tempos = { completoMs: 200, selecionadoMs: 100, statusCompleto: 0, statusSelecionado: 0 };
type Estado = "passed" | "failed" | "skipped" | "todo" | "pending";
// Campos emitidos pelo JsonReporter instalado, incluindo describes nas contagens de suites.
function relatorio(arquivos: [string, Estado[]][]) {
  const estados = arquivos.flatMap(([, casos]) => casos);
  const falhas = arquivos.filter(([, casos]) => casos.includes("failed")).length;
  return {
    success: falhas === 0,
    numTotalTestSuites: arquivos.length * 2,
    numPassedTestSuites: (arquivos.length - falhas) * 2,
    numFailedTestSuites: falhas * 2,
    numPendingTestSuites: 0,
    numTotalTests: estados.length,
    numPassedTests: estados.filter((estado) => estado === "passed").length,
    numFailedTests: estados.filter((estado) => estado === "failed").length,
    numPendingTests: estados.filter((estado) => ["skipped", "pending"].includes(estado)).length,
    numTodoTests: estados.filter((estado) => estado === "todo").length,
    testResults: arquivos.map(([name, casos]) => ({
      name, status: casos.includes("failed") ? "failed" : "passed", message: "", startTime: 1, endTime: 2,
      assertionResults: casos.map((status, indice) => ({
        fullName: `${name} caso ${indice}`, title: `caso ${indice}`, ancestorTitles: [name], status,
        failureMessages: status === "failed" ? ["assertion failed"] : [],
      })),
    })),
  };
}
const completo = () => relatorio([[a, ["passed"]], [b, ["passed"]]]);
const selecionado = () => relatorio([[a, ["passed"]]]);

describe("comparador da sombra", () => {
  it("aceita relatório completo e calcula economia líquida negativa apesar de selecionar metade", () => {
    expect(compararSombra(plano, completo(), selecionado(), tempos)).toMatchObject({ valido: true, divergencias: [], economiaBrutaMs: 100, economiaLiquidaMs: -20, proporcaoSelecionada: 0.5 });
  });

  it("aceita fallback completo e skip/todo válidos", () => {
    const execucao = relatorio([[a, ["skipped", "todo"]], [b, ["passed"]]]);
    expect(compararSombra({ ...plano, modo: "completo", testesSelecionados: [a, b] }, execucao, execucao, tempos)).toMatchObject({ valido: true, divergencias: [] });
  });

  it("diferencia falhas normais de teste de execução inválida", () => {
    expect(compararSombra(plano, relatorio([[a, ["failed"]], [b, ["passed"]]]), relatorio([[a, ["failed"]]]), { ...tempos, statusCompleto: 1, statusSelecionado: 1 })).toMatchObject({ valido: true, divergencias: [], falhasExecucaoCompleta: [a], falhasExecucaoSelecionada: [a], economiaBrutaMs: null, economiaLiquidaMs: null });
  });

  it("não mede economia quando hooks falham nos casos em ambas as execuções", () => {
    const c = relatorio([[a, ["failed"]], [b, ["passed"]]]);
    const s = relatorio([[a, ["failed"]]]);
    for (const execucao of [c, s]) {
      execucao.testResults[0]!.assertionResults[0]!.failureMessages = ["Error: beforeEach failed"];
    }
    expect(compararSombra(plano, c, s, { ...tempos, statusCompleto: 1, statusSelecionado: 1 }))
      .toMatchObject({ divergencias: [], economiaBrutaMs: null, economiaLiquidaMs: null });
  });

  it("distingue casos com fullName igual e hierarquias diferentes", () => {
    const c = relatorio([[a, ["passed", "failed"]], [b, ["passed"]]]);
    const s = relatorio([[a, ["failed", "passed"]]]);
    for (const execucao of [c, s]) {
      const casos = execucao.testResults[0]!.assertionResults;
      Object.assign(casos[0]!, { fullName: "a b c", ancestorTitles: ["a"], title: "b c" });
      Object.assign(casos[1]!, { fullName: "a b c", ancestorTitles: ["a b"], title: "c" });
    }
    expect(compararSombra(plano, c, s, { ...tempos, statusCompleto: 1, statusSelecionado: 1 }))
      .toMatchObject({ divergencias: [`resultados divergentes: ${a}`], economiaLiquidaMs: null });
  });

  it("detecta falhas omitidas por identidade exata, não por sufixo", () => {
    const omitido = `/outro${a}`;
    const resultado = compararSombra({ ...plano, inventarioCompleto: [a, omitido] }, relatorio([[a, ["passed"]], [omitido, ["failed"]]]), selecionado(), { ...tempos, statusCompleto: 1 });
    expect(resultado).toMatchObject({ valido: true, falhasEmTestesOmitidos: [omitido], economiaBrutaMs: null, economiaLiquidaMs: null });
    expect(resultado.divergencias).not.toHaveLength(0);
  });

  it("detecta resultado divergente no mesmo teste", () => {
    const resultado = compararSombra(plano, relatorio([[a, ["failed"]], [b, ["passed"]]]), selecionado(), { ...tempos, statusCompleto: 1 });
    expect(resultado).toMatchObject({ valido: true, economiaLiquidaMs: null });
    expect(resultado.divergencias).toEqual([`resultados divergentes: ${a}`]);
  });

  it.each([
    ["seleção vazia", { ...plano, testesSelecionados: [] }, completo(), relatorio([]), tempos],
    ["arquivo planejado ausente", plano, completo(), relatorio([]), tempos],
    ["suíte completa parcial", plano, selecionado(), selecionado(), tempos],
    ["arquivo extra", plano, completo(), completo(), tempos],
    ["inventário duplicado", { ...plano, inventarioCompleto: [a, a] }, completo(), selecionado(), tempos],
    ["seleção fora do inventário", { ...plano, testesSelecionados: ["/fora.ts"] }, completo(), selecionado(), tempos],
    ["fallback não completo", { ...plano, modo: "completo" }, completo(), selecionado(), tempos],
    ["total do plano incorreto", { ...plano, totalTestes: 3 }, completo(), selecionado(), tempos],
    ["contagem incorreta", plano, { ...completo(), numTotalTests: 3 }, selecionado(), tempos],
    ["suites inconsistentes", plano, { ...completo(), numTotalTestSuites: 1 }, selecionado(), tempos],
    ["zero casos", plano, relatorio([[a, []], [b, []]]), relatorio([[a, []]]), tempos],
    ["caso ainda pendente", plano, relatorio([[a, ["pending"]], [b, ["passed"]]]), relatorio([[a, ["pending"]]]), tempos],
    ["casos parciais no arquivo", plano, relatorio([[a, ["passed", "passed"]], [b, ["passed"]]]), selecionado(), tempos],
    ["success inconsistente", plano, { ...completo(), success: false }, selecionado(), tempos],
    ["saída incompatível", plano, completo(), selecionado(), { ...tempos, statusSelecionado: 1 }],
    ["saída de infraestrutura", plano, completo(), selecionado(), { ...tempos, statusCompleto: 2 }],
    ["tempo inválido", plano, completo(), selecionado(), { ...tempos, completoMs: -1 }],
    ["reprodução do review", plano, { testResults: [{ name: a, status: "failed" }] }, { success: true, testResults: [] }, tempos],
  ])("invalida %s sem economia", (_nome, p, c, s, t) => {
    const resultado = compararSombra(p, c, s, t);
    expect(resultado).toMatchObject({ valido: false, economiaBrutaMs: null, economiaLiquidaMs: null });
    expect(resultado.motivosInvalidade.length).toBeGreaterThan(0);
  });

  it("invalida erro de hook/coleta mesmo com código 1 e success false", () => {
    const c = completo();
    c.success = false;
    c.numFailedTestSuites = 2;
    c.numPassedTestSuites = 2;
    c.testResults[0]!.status = "failed";
    c.testResults[0]!.message = "beforeAll failed";
    expect(compararSombra(plano, c, selecionado(), { ...tempos, statusCompleto: 1 })).toMatchObject({ valido: false, economiaLiquidaMs: null });
  });

  it.each([false, true])("CLI retorna código coerente com validade da execução (reprodução=%s)", (reproducao) => {
    const diretorio = mkdtempSync(join(tmpdir(), "comparar-sombra-cli-"));
    try {
      const entradas = [plano, reproducao ? { testResults: [{ name: a, status: "failed" }] } : completo(), reproducao ? { success: true, testResults: [] } : selecionado(), tempos];
      const arquivos = entradas.map((entrada, indice) => {
        const caminho = join(diretorio, `${indice}.json`);
        writeFileSync(caminho, JSON.stringify(entrada));
        return caminho;
      });
      const cli = spawnSync(process.execPath, ["--import", "tsx", "scripts/comparar-testes-sombra.ts", ...arquivos], { encoding: "utf8" });
      expect(cli.status).toBe(reproducao ? 1 : 0);
      expect(JSON.parse(cli.stdout)).toMatchObject({ valido: !reproducao, economiaLiquidaMs: reproducao ? null : -20 });
    } finally {
      rmSync(diretorio, { recursive: true, force: true });
    }
  });

  it("CLI produz JSON inválido e nonzero para arquivos ausentes/corrompidos", () => {
    const diretorio = mkdtempSync(join(tmpdir(), "comparar-sombra-"));
    try {
      const corrompido = join(diretorio, "corrompido.json");
      writeFileSync(corrompido, "{");
      const arquivos = [corrompido, ...["completo", "selecionado", "tempos"].map((nome) => join(diretorio, `${nome}.json`))];
      const resultado = compararArquivosSombra(arquivos);
      expect(resultado.valido).toBe(false);
      expect(resultado.motivosInvalidade.join("\n")).toContain("JSON ausente ou corrompido");
      const cli = spawnSync(process.execPath, ["--import", "tsx", "scripts/comparar-testes-sombra.ts", ...arquivos], { encoding: "utf8" });
      expect(cli.status).toBe(1);
      expect(JSON.parse(cli.stdout)).toMatchObject({ valido: false, economiaBrutaMs: null, economiaLiquidaMs: null });
    } finally {
      rmSync(diretorio, { recursive: true, force: true });
    }
  });
});
