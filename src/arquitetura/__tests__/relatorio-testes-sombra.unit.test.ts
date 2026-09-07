import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsearArgumentosSombra } from "../../../scripts/argumentos-testes-sombra";
import { executarTestesSombra } from "../../../scripts/executar-testes-sombra";

vi.mock("node:child_process", () => {
  const mock = { spawnSync: vi.fn() };
  return { ...mock, default: mock };
});
afterEach(() => vi.resetAllMocks());

describe("CLI do relatório sombra", () => {
  it("aplica defaults sem acessar argv[0]", () => {
    expect(parsearArgumentosSombra(["--base", "abc"])).toEqual({ base: "abc", head: "HEAD", output: "relatorio-testes-sombra.json" });
  });

  it("aceita opcionais explícitos em qualquer ordem", () => {
    expect(parsearArgumentosSombra(["--output", 'arquivo com "aspas".json', "--head", "def", "--base", "abc"])).toEqual({ base: "abc", head: "def", output: 'arquivo com "aspas".json' });
  });

  it.each([[], ["--base"], ["--base", "--head", "HEAD"], ["--base", ""], ["--base", "abc", "--head"], ["--base", "abc", "--output"], ["--base", "abc", "--head", "--output", "file"], ["--base", "abc", "--out", "file"], ["--base", "abc", "--base", "def"]])("recusa argumentos inválidos: %j", (...args) => {
    expect(() => parsearArgumentosSombra(args)).toThrow();
  });

  it("envia cada caminho intacto ao Vitest sem interpretação do shell", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, signal: null, output: [], pid: 1, stdout: "", stderr: "" });
    const arquivos = ['/repo/com espaços.unit.test.ts', '/repo/com "aspas" e \'simples\'.unit.test.ts'];
    expect(executarTestesSombra({ modo: "relacionados", testesSelecionados: arquivos })).toBe(1);
    expect(spawnSync).toHaveBeenCalledWith("npm", ["exec", "--", "vitest", "run", "--project", "unidade", "--reporter=json", "--outputFile=unitarios-selecionados.json", ...arquivos], { stdio: "inherit" });
  });

  it("fallback executa tudo mesmo sem listagem; relacionados vazios não executam", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, signal: null, output: [], pid: 1, stdout: "", stderr: "" });
    expect(executarTestesSombra({ modo: "completo", testesSelecionados: [] })).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(() => executarTestesSombra({ modo: "relacionados", testesSelecionados: [] })).toThrow("seleção vazia");
    expect(spawnSync).toHaveBeenCalledTimes(1);
  });
});
