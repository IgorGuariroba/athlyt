import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface Mudanca {
  status: string;
  caminhos: string[];
}

export type Decisao =
  | { modo: "relacionados"; motivo: string }
  | { modo: "completo"; motivo: string };

const ARQUIVOS_DE_CONFIGURACAO = [
  /^\.github\//,
  /^\.githooks\//,
  /^package(-lock)?\.json$/,
  /^vitest\.config\./,
  /^vitest\.setup\./,
  /^tsconfig(?:\..+)?\.json$/,
  /^eslint\.config\./,
  /^next\.config\./,
  /^vite\.config\./,
  /^drizzle\//,
  /^src\/db\/schema\./,
];

export const TESTES_OBRIGATORIOS = [
  "src/arquitetura/__tests__/dev-local.unit.test.ts",
  "src/arquitetura/__tests__/governanca-invalidacao.unit.test.ts",
  "src/arquitetura/__tests__/governanca-prato-revisado.unit.test.ts",
  "src/arquitetura/__tests__/governanca-ui.unit.test.ts",
];

export function parsearMudancasGit(saida: string): Mudanca[] {
  const campos = saida.split("\0").filter(Boolean);
  const mudancas: Mudanca[] = [];

  for (let indice = 0; indice < campos.length; indice += 1) {
    const status = campos[indice];
    if (status === undefined) continue;
    const codigo = status.slice(0, 1);
    const quantidade = codigo === "R" || codigo === "C" ? 2 : 1;
    const caminhos = campos.slice(indice + 1, indice + 1 + quantidade);
    if (caminhos.length !== quantidade) {
      throw new Error("saída de diff Git incompleta");
    }
    mudancas.push({ status: codigo, caminhos });
    indice += quantidade;
  }

  return mudancas;
}

export function decidir(mudancas: Mudanca[]): Decisao {
  if (mudancas.some(({ status }) => status === "D" || status === "R" || status === "C")) {
    return {
      modo: "completo",
      motivo: "exclusão, cópia ou renomeação pode esconder dependências",
    };
  }

  const arquivos = mudancas.flatMap(({ caminhos }) => caminhos);
  const configuracao = arquivos.find((arquivo) =>
    ARQUIVOS_DE_CONFIGURACAO.some((padrao) => padrao.test(arquivo)),
  );
  if (configuracao !== undefined) {
    return {
      modo: "completo",
      motivo: `arquivo sensível sem seleção segura: ${configuracao}`,
    };
  }

  const desconhecido = arquivos.find(
    (arquivo) => !arquivo.startsWith("src/") && !arquivo.startsWith("scripts/"),
  );
  if (desconhecido !== undefined) {
    return {
      modo: "completo",
      motivo: `caminho sem mapeamento conhecido: ${desconhecido}`,
    };
  }

  return {
    modo: "relacionados",
    motivo: arquivos.length === 0 ? "nenhum arquivo mudou" : "grafo de dependências do Vitest",
  };
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

function executar(comando: string, args: string[]): void {
  execFileSync(comando, args, { stdio: "inherit" });
}

export function executarSelecao(base: string, head: string): void {
  if (!existsSync(resolve("package.json"))) {
    throw new Error("package.json não encontrado; seletor executado fora do repositório");
  }
  if (git(["rev-parse", "--verify", base]).trim() === "") {
    throw new Error(`base Git inválida: ${base}`);
  }
  if (git(["rev-parse", "--verify", head]).trim() !== git(["rev-parse", "HEAD"]).trim()) {
    throw new Error("o head enviado não é o commit atualmente verificado; recusando testar outro estado");
  }

  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status !== "") {
    throw new Error("a árvore de trabalho não está limpa; commit ou guarde as alterações antes do pre-push");
  }

  const mudancas = parsearMudancasGit(
    git(["diff", "--name-status", "-z", "--find-renames", base, head]),
  );
  const decisao = decidir(mudancas);
  const arquivos = mudancas.flatMap(({ caminhos }) => caminhos);
  console.log(`pre-push: modo=${decisao.modo}; base=${base}; head=${head}`);
  console.log(`pre-push: arquivos alterados=${arquivos.length ? arquivos.join(", ") : "(nenhum)"}`);
  console.log(`pre-push: motivo=${decisao.motivo}`);

  if (decisao.modo === "completo") {
    console.log("pre-push: executando todos os testes unitários (fallback conservador).");
    executar("npm", ["run", "test:unit"]);
    return;
  }

  console.log("pre-push: executando unitários relacionados pelo Vitest (--changed).");
  executar("npm", ["exec", "--", "vitest", "run", "--project", "unidade", "--changed", base, "--passWithNoTests"]);
  console.log(`pre-push: executando testes obrigatórios: ${TESTES_OBRIGATORIOS.join(", ")}`);
  executar("npm", ["exec", "--", "vitest", "run", "--project", "unidade", ...TESTES_OBRIGATORIOS]);
}

