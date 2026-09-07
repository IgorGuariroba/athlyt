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

export interface Camadas {
  integracao: boolean;
  e2e: boolean;
}

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
  /^drizzle\.config\./,
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
  if (mudancas.some(({ status }) => !["A", "M"].includes(status))) {
    return {
      modo: "completo",
      motivo: "status Git não mapeado pode esconder dependências",
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

function executarComSaida(comando: string, args: string[]): string {
  return execFileSync(comando, args, {
    encoding: "utf8",
    env: { ...process.env, DOTENV_CONFIG_QUIET: "true" },
  });
}

function arquivoDoTeste(teste: unknown): string {
  if (typeof teste !== "object" || teste === null) {
    throw new Error("Vitest retornou um teste inválido");
  }
  const registro = teste as Record<string, unknown>;
  if (typeof registro.file !== "string") {
    throw new Error("Vitest retornou um teste sem arquivo");
  }
  return registro.file;
}

function listarTestesRelacionados(base: string): string[] {
  const saida = executarComSaida("npm", [
    "exec",
    "--",
    "vitest",
    "list",
    "--project",
    "unidade",
    "--changed",
    base,
    "--json",
  ]);
  const testes: unknown = JSON.parse(saida);
  if (!Array.isArray(testes)) throw new Error("Vitest retornou uma lista de testes inválida");
  const arquivos = [...new Set(testes.map(arquivoDoTeste))];
  if (arquivos.length === 0) throw new Error("nenhum teste relacionado encontrado; seleção ambígua");
  return arquivos;
}

export function determinarCamadas(mudancas: Mudanca[]): Camadas {
  const arquivos = mudancas.flatMap(({ caminhos }) => caminhos);
  const integracao = arquivos.some((arquivo) =>
    /^(package(-lock)?\.json|vitest\.config\.|vitest\.setup\.|tsconfig(?:\..+)?\.json|drizzle\/|drizzle\.config\.|src\/db\/schema\.)/.test(arquivo),
  );
  const e2e = arquivos.some(
    (arquivo) => !arquivo.startsWith("docs/") && !arquivo.startsWith(".vscode/") && !arquivo.endsWith(".md"),
  );
  return { integracao, e2e };
}

class EstadoEnviadoIndisponivel extends Error {}

function executarFallback(motivo: unknown, base: string, head: string): void {
  const mensagem = motivo instanceof Error ? motivo.message : String(motivo);
  console.error(`pre-push: modo=completo; base=${base}; head=${head}; arquivos selecionados=indisponíveis`);
  console.error("pre-push: testes selecionados=todos os unitários");
  console.error(`pre-push: motivo=${mensagem}`);
  executar("npm", ["run", "test:unit"]);
}

export function executarSelecao(base: string, head: string): void {
  let testesIniciados = false;
  try {
    if (!existsSync(resolve("package.json"))) {
      throw new Error("package.json não encontrado; seletor executado fora do repositório");
    }
    const baseResolvida = git(["rev-parse", "--verify", base]).trim();
    const headResolvido = git(["rev-parse", "--verify", head]).trim();
    const headAtual = git(["rev-parse", "HEAD"]).trim();
    if (headResolvido !== headAtual) {
      throw new EstadoEnviadoIndisponivel("o head enviado não é o commit atualmente verificado; recusando testar outro estado");
    }
    if (execFileSync("git", ["merge-base", "--is-ancestor", baseResolvida, headResolvido], { encoding: "utf8" }) !== "") {
      throw new Error("a base enviada não é ancestral do head; estado não-fast-forward exige fallback completo");
    }

    const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status !== "") {
      throw new EstadoEnviadoIndisponivel("a árvore de trabalho não está limpa; commit ou guarde as alterações antes do pre-push");
    }

    const mudancas = parsearMudancasGit(
      git(["diff", "--name-status", "-z", "--find-renames", baseResolvida, headResolvido]),
    );
    const decisao = decidir(mudancas);
    const arquivos = mudancas.flatMap(({ caminhos }) => caminhos);
    console.log(`pre-push: modo=${decisao.modo}; base=${baseResolvida}; head=${headResolvido}`);
    console.log(`pre-push: arquivos alterados=${arquivos.length ? arquivos.join(", ") : "(nenhum)"}`);
    console.log(`pre-push: motivo=${decisao.motivo}`);

    if (decisao.modo === "completo") {
      console.log("pre-push: executando todos os testes unitários (fallback conservador).");
      testesIniciados = true;
      executar("npm", ["run", "test:unit"]);
      return;
    }

    // A validação de ancestralidade acima garante que --changed use exatamente
    // o conjunto de commits enviado, e não uma comparação divergente com HEAD.
    const testesRelacionados = listarTestesRelacionados(baseResolvida);
    const testesSelecionados = [...new Set([
      ...testesRelacionados,
      ...TESTES_OBRIGATORIOS.map((arquivo) => resolve(arquivo)),
    ])];
    console.log(`pre-push: testes selecionados=${testesSelecionados.join(", ")}`);
    console.log("pre-push: executando unitários relacionados e obrigatórios pelo Vitest.");
    testesIniciados = true;
    executar("npm", ["exec", "--", "vitest", "run", "--project", "unidade", ...testesSelecionados]);
  } catch (erro) {
    if (testesIniciados || erro instanceof EstadoEnviadoIndisponivel) throw erro;
    executarFallback(erro, base, head);
  }
}

