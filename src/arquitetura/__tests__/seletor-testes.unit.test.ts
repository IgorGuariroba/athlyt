import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decidir, determinarCamadas, executarSelecao, parsearListaVitest, parsearMudancasGit, planejarSelecao, TESTES_OBRIGATORIOS } from "../../../scripts/seletor-testes";

vi.mock("node:child_process", () => {
  const mock = { execFileSync: vi.fn() };
  return { ...mock, default: mock };
});
afterEach(() => vi.resetAllMocks());

const arquivoRelacionado = resolve('src/arquivo com espaço e "aspas".unit.test.ts');
function simularComandos(opcoes: { baseAusente?: boolean; suja?: boolean; head?: string; selecaoFalha?: boolean; execucaoFalha?: boolean; naoAncestral?: boolean; vazio?: boolean } = {}) {
  vi.mocked(execFileSync).mockImplementation((comando, args) => {
    if (comando === "git") {
      if (args?.[0] === "rev-parse") {
        if (args.includes("base^{commit}")) {
          if (opcoes.baseAusente) throw new Error("base indisponível");
          return "base-sha\n";
        }
        if (args.includes("head^{commit}")) return `${opcoes.head ?? "head-sha"}\n`;
        return "head-sha\n";
      }
      if (args?.[0] === "status") return opcoes.suja ? " M src/a.ts\n" : "";
      if (args?.[0] === "merge-base" && opcoes.naoAncestral) throw new Error("exit 1");
      if (args?.[0] === "diff") return "M\0src/a.ts\0";
      return "";
    }
    if (args?.includes("list")) {
      if (opcoes.selecaoFalha) throw new Error("Vitest list falhou");
      return JSON.stringify(opcoes.vazio ? [] : [{ file: arquivoRelacionado }]);
    }
    if (opcoes.execucaoFalha) throw new Error("teste falhou");
    return "";
  });
}

describe("seletor conservador de testes", () => {
  it("preserva caminhos com espaços e renomeações do diff NUL-delimitado", () => {
    expect(parsearMudancasGit("M\0src/arquivo com espaço.ts\0R100\0src/a.ts\0src/b.ts\0")).toEqual([
      { status: "M", caminhos: ["src/arquivo com espaço.ts"] },
      { status: "R", caminhos: ["src/a.ts", "src/b.ts"] },
    ]);
  });

  it("usa relacionados para código conhecido", () => {
    expect(decidir([{ status: "M", caminhos: ["src/domain/alimentos/prato.ts"] }])).toEqual({
      modo: "relacionados",
      motivo: "grafo de dependências do Vitest",
    });
  });

  it("faz fallback para configuração, exclusão e caminho desconhecido", () => {
    expect(decidir([{ status: "M", caminhos: ["package-lock.json"] }]).modo).toBe("completo");
    expect(decidir([{ status: "D", caminhos: ["src/domain/antigo.ts"] }]).modo).toBe("completo");
    expect(decidir([{ status: "M", caminhos: ["public/logo.svg"] }]).modo).toBe("completo");
    expect(decidir([{ status: "T", caminhos: ["src/domain/prato.ts"] }]).modo).toBe("completo");
  });

  it("mantém integração para mudanças sensíveis mesmo fora da main", () => {
    expect(determinarCamadas([{ status: "M", caminhos: ["drizzle.config.ts"] }])).toEqual({
      integracao: true,
      e2e: true,
    });
    expect(determinarCamadas([{ status: "M", caminhos: ["docs/decisao.md"] }])).toEqual({
      integracao: false,
      e2e: false,
    });
  });
});

describe("planejamento do pre-push", () => {
  it("preserva relacionados, obrigatórios e argumentos com espaços/aspas", () => {
    simularComandos();
    const plano = planejarSelecao("base", "head");
    expect(plano.modo).toBe("relacionados");
    expect(plano.testesSelecionados).toEqual([arquivoRelacionado, ...TESTES_OBRIGATORIOS.map((teste) => resolve(teste))]);
    executarSelecao("base", "head");
    expect(execFileSync).toHaveBeenLastCalledWith("npm", ["exec", "--", "vitest", "run", "--project", "unidade", ...plano.testesSelecionados!], { stdio: "inherit" });
  });

  it.each([
    [{ baseAusente: true }, "base indisponível"],
    [{ selecaoFalha: true }, "Vitest list falhou"],
    [{ naoAncestral: true }, "base não ancestral"],
    [{ vazio: true }, "nenhum teste relacionado"],
  ] as const)("faz fallback completo para %j", (opcoes, motivo) => {
    simularComandos(opcoes);
    expect(planejarSelecao("base", "head")).toMatchObject({ modo: "completo", testesSelecionados: null, motivo: expect.stringContaining(motivo) });
    executarSelecao("base", "head");
    expect(execFileSync).toHaveBeenLastCalledWith("npm", ["run", "test:unit"], { stdio: "inherit" });
  });

  it.each([{ suja: true }, { head: "outro-commit" }])("recusa estado incorreto antes mesmo de resolver base ausente: %j", (opcoes) => {
    simularComandos({ ...opcoes, baseAusente: true });
    expect(() => { executarSelecao("base", "head"); }).toThrow(/árvore de trabalho|head enviado/);
    expect(vi.mocked(execFileSync).mock.calls.every(([comando]) => comando === "git")).toBe(true);
  });

  it.each([false, true])("propaga falha de testes sem executar outro fallback (completo=%s)", (baseAusente) => {
    simularComandos({ execucaoFalha: true, baseAusente });
    expect(() => { executarSelecao("base", "head"); }).toThrow("teste falhou");
    const execucoes = vi.mocked(execFileSync).mock.calls.filter(([comando, args]) => comando === "npm" && args?.includes("run"));
    expect(execucoes).toHaveLength(1);
  });

  it("valida o único parser da lista Vitest", () => {
    expect(parsearListaVitest(`prefixo\n${JSON.stringify([{ file: arquivoRelacionado }, { file: arquivoRelacionado }])}`)).toEqual([arquivoRelacionado]);
    for (const saida of ["sem JSON", "[", '[{"name":"sem arquivo"}]', '[{"file":""}]']) {
      expect(() => parsearListaVitest(saida)).toThrow();
    }
  });
});
