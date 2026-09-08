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

export function parsearListaVitest(saida: string): string[] {
  const inicioJson = saida.indexOf("[");
  if (inicioJson < 0) throw new Error("Vitest não retornou JSON de testes");
  const testes: unknown = JSON.parse(saida.slice(inicioJson));
  if (!Array.isArray(testes)) throw new Error("Vitest retornou uma lista inválida");
  return [...new Set(testes.map((teste: unknown) => {
    if (typeof teste !== "object" || teste === null || !("file" in teste)
      || typeof teste.file !== "string" || teste.file.length === 0) {
      throw new Error("Vitest retornou um teste sem arquivo");
    }
    return resolve(teste.file);
  }))];
}

export function listarTestes(base: string): string[] {
  // filesOnly inclui arquivos com apenas skip/todo e não depende da coleta de casos.
  return parsearListaVitest(executarComSaida("npm", [
    "exec", "--", "vitest", "list", "--project", "unidade", "--filesOnly",
    "--changed", base, "--json",
  ]));
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

export interface PlanoSelecao {
  modo: Decisao["modo"];
  motivo: string;
  base: string;
  head: string;
  arquivosAlterados: string[];
  // null significa executar a suíte inteira, mesmo se a listagem estiver indisponível.
  testesSelecionados: string[] | null;
}

export function planejarSelecao(base: string, head: string): PlanoSelecao {
  // Estas recusas precedem a resolução da base: uma base ausente nunca pode
  // autorizar testes sobre a árvore suja ou sobre outro commit.
  if (!existsSync(resolve("package.json"))) {
    throw new EstadoEnviadoIndisponivel("package.json não encontrado; seletor executado fora do repositório");
  }
  const headResolvido = git(["rev-parse", "--verify", `${head}^{commit}`]).trim();
  if (headResolvido !== git(["rev-parse", "HEAD"]).trim()) {
    throw new EstadoEnviadoIndisponivel("o head enviado não é o commit atualmente verificado; recusando testar outro estado");
  }
  if (git(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") {
    throw new EstadoEnviadoIndisponivel("a árvore de trabalho não está limpa; commit ou guarde as alterações antes do pre-push");
  }

  let baseResolvida = base;
  let arquivosAlterados: string[] = [];
  try {
    baseResolvida = git(["rev-parse", "--verify", `${base}^{commit}`]).trim();
    try {
      git(["merge-base", "--is-ancestor", baseResolvida, headResolvido]);
    } catch {
      throw new Error("base não ancestral ou histórico indisponível; seleção insegura");
    }
    const mudancas = parsearMudancasGit(
      git(["diff", "--name-status", "-z", "--find-renames", baseResolvida, headResolvido]),
    );
    arquivosAlterados = mudancas.flatMap(({ caminhos }) => caminhos);
    const decisao = decidir(mudancas);
    if (decisao.modo === "completo") throw new Error(decisao.motivo);
    const relacionados = listarTestes(baseResolvida);
    if (relacionados.length === 0) throw new Error("nenhum teste relacionado encontrado; seleção ambígua");
    return {
      ...decisao, base: baseResolvida, head: headResolvido, arquivosAlterados,
      testesSelecionados: [...new Set([...relacionados, ...TESTES_OBRIGATORIOS.map((teste) => resolve(teste))])],
    };
  } catch (erro) {
    return {
      modo: "completo", motivo: erro instanceof Error ? erro.message : String(erro),
      base: baseResolvida, head: headResolvido, arquivosAlterados, testesSelecionados: null,
    };
  }
}

export function executarSelecao(base: string, head: string): void {
  const plano = planejarSelecao(base, head);
  console.log(`pre-push: modo=${plano.modo}; base=${plano.base}; head=${plano.head}`);
  console.log(`pre-push: arquivos alterados=${plano.arquivosAlterados.join(", ") || "(nenhum)"}`);
  console.log(`pre-push: motivo=${plano.motivo}`);
  console.log(`pre-push: testes selecionados=${plano.testesSelecionados?.join(", ") ?? "todos os unitários"}`);
  // Falhas de execução propagam: nunca são confundidas com falhas de seleção.
  if (plano.testesSelecionados === null) executar("npm", ["run", "test:unit"]);
  else executar("npm", ["exec", "--", "vitest", "run", "--project", "unidade", ...plano.testesSelecionados]);
}
