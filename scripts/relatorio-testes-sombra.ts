import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { decidir, parsearMudancasGit, TESTES_OBRIGATORIOS, type Mudanca } from "./seletor-testes";

interface Plano {
  modo: "relacionados" | "completo";
  motivo: string;
  base: string;
  head: string;
  arquivosAlterados: string[];
  testesSelecionados: string[];
  totalTestes: number;
  custoSeletorMs: number;
}

const output = process.argv[process.argv.indexOf("--output") + 1] ?? "relatorio-testes-sombra.json";
const base = process.argv[process.argv.indexOf("--base") + 1];
const head = process.argv[process.argv.indexOf("--head") + 1] ?? "HEAD";

if (base === undefined) throw new Error("uso: tsx scripts/relatorio-testes-sombra.ts --base <sha> [--head <sha>] [--output <arquivo>]");

const env = { ...process.env, DOTENV_CONFIG_QUIET: "true" };
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}
function vitestList(args: string[] = []): unknown[] {
  const saida = execFileSync("npm", ["exec", "--", "vitest", "list", "--project", "unidade", ...args, "--json"], { encoding: "utf8", env });
  const inicioJson = saida.indexOf("[");
  if (inicioJson < 0) throw new Error("Vitest não retornou JSON de testes");
  const parsed: unknown = JSON.parse(saida.slice(inicioJson));
  if (!Array.isArray(parsed)) throw new Error("Vitest retornou uma lista inválida");
  return parsed;
}
function arquivoDoTeste(teste: unknown): string {
  if (typeof teste !== "object" || teste === null) throw new Error("Vitest retornou um teste inválido");
  const registro = teste as { file?: unknown; filepath?: unknown };
  const arquivo = registro.file ?? registro.filepath;
  if (typeof arquivo !== "string") throw new Error("Vitest retornou um teste sem arquivo");
  return arquivo;
}
function selecionar(baseResolvida: string, mudancasGit: Mudanca[]): { modo: Plano["modo"]; motivo: string; testes: string[] } {
  const decisao = decidir(mudancasGit);
  if (decisao.modo === "completo") {
    return { modo: "completo", motivo: decisao.motivo, testes: vitestList().map(arquivoDoTeste) };
  }
  const relacionados = [...new Set(vitestList(["--changed", baseResolvida]).map(arquivoDoTeste))];
  if (relacionados.length === 0) return { modo: "completo", motivo: "nenhum teste relacionado encontrado", testes: vitestList().map(arquivoDoTeste) };
  return { modo: "relacionados", motivo: "grafo de dependências do Vitest + testes obrigatórios", testes: [...relacionados, ...TESTES_OBRIGATORIOS.map((teste) => resolve(teste))] };
}

const inicio = performance.now();
const baseResolvida = git(["rev-parse", "--verify", base]).trim();
const headResolvido = git(["rev-parse", "--verify", head]).trim();
if (git(["rev-parse", "HEAD"]).trim() !== headResolvido) throw new Error("head enviado não é o commit verificado");
if (git(["status", "--porcelain", "--untracked-files=all"]) !== "") throw new Error("árvore de trabalho suja");
execFileSync("git", ["merge-base", "--is-ancestor", baseResolvida, headResolvido]);
const mudancasGit = parsearMudancasGit(git(["diff", "--name-status", "-z", "--find-renames", baseResolvida, headResolvido]));
const arquivos = mudancasGit.flatMap(({ caminhos }) => caminhos);
const plano = selecionar(baseResolvida, mudancasGit);
const total = [...new Set(vitestList().map(arquivoDoTeste))];
const relatorio: Plano = { modo: plano.modo, motivo: plano.motivo, base: baseResolvida, head: headResolvido, arquivosAlterados: arquivos, testesSelecionados: [...new Set(plano.testes)], totalTestes: total.length, custoSeletorMs: Math.round(performance.now() - inicio) };
writeFileSync(output, `${JSON.stringify(relatorio, null, 2)}\n`);
console.log(JSON.stringify(relatorio));
