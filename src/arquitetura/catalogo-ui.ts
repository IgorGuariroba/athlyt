/**
 * Leitura do catálogo de componentes de interface do projeto.
 *
 * O catálogo é derivado do código (`src/components/**`), nunca de uma
 * lista mantida à mão: uma lista paralela envelhece e volta a permitir
 * que o agente reinvente um componente que já existe.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export interface ComponenteCatalogo {
  /** Caminho relativo à raiz do projeto. */
  arquivo: string;
  /** Alias de import (`@/components/...`). */
  importPath: string;
  /** Camada: `ui` (primitivos shadcn) ou `tela`/`navigation` (composição). */
  camada: string;
  /** Nomes exportados (componentes, tipos e helpers). */
  exports: string[];
  /** Subconjunto de `exports` exportado como `type`/`interface`. */
  tipos: string[];
  /** Variantes declaradas via cva: grupo -> opções. */
  variantes: Record<string, string[]>;
  /** Primeiro bloco de documentação do arquivo, quando existe. */
  doc?: string;
}

const RAIZ_COMPONENTES = join("src", "components");

function listarArquivos(dir: string): string[] {
  let entradas: string[] = [];
  try {
    entradas = readdirSync(dir);
  } catch {
    return [];
  }
  const resultado: string[] = [];
  for (const entrada of entradas) {
    if (entrada === "__tests__" || entrada === "node_modules") continue;
    const caminho = join(dir, entrada);
    const info = statSync(caminho);
    if (info.isDirectory()) {
      resultado.push(...listarArquivos(caminho));
      continue;
    }
    if (!entrada.endsWith(".tsx") && !entrada.endsWith(".ts")) continue;
    if (entrada.endsWith(".test.ts") || entrada.endsWith(".test.tsx")) continue;
    // Uma story exporta `Padrao`, `Variantes`, `Estados` — nomes que
    // parecem componentes e entrariam no catálogo como se fossem
    // reutilizáveis. A story descreve um componente; não é um.
    if (entrada.endsWith(".stories.ts") || entrada.endsWith(".stories.tsx")) continue;
    if (entrada === "index.ts") continue;
    resultado.push(caminho);
  }
  return resultado;
}

/**
 * Nomes exportados, separando o que é tipo do que é valor.
 *
 * A distinção não é cosmética: a governança exige uma story de cada
 * componente, e `type Serie` ou `type Macro` jamais poderiam ter uma.
 * Sem separar, a única saída seria uma lista de exceções mantida à mão
 * — exatamente o que este catálogo existe para eliminar.
 */
function extrairExports(fonte: string): { exports: string[]; tipos: string[] } {
  const nomes = new Set<string>();
  const tipos = new Set<string>();

  const declarado =
    /export\s+(?:async\s+)?(function|const|type|interface)\s+([A-Za-z0-9_]+)/g;
  for (const m of fonte.matchAll(declarado)) {
    const nome = m[2];
    if (!nome) continue;
    nomes.add(nome);
    if (m[1] === "type" || m[1] === "interface") tipos.add(nome);
  }

  const reexport = /export\s*\{([^}]*)\}/g;
  for (const m of fonte.matchAll(reexport)) {
    const lista = m[1];
    if (!lista) continue;
    for (const parte of lista.split(",")) {
      const ehTipo = /\btype\b/.test(parte);
      const nome = parte.replace(/\btype\b/, "").split(/\s+as\s+/).pop()?.trim();
      if (!nome) continue;
      nomes.add(nome);
      if (ehTipo) tipos.add(nome);
    }
  }

  return { exports: [...nomes], tipos: [...tipos] };
}

/** Extrai `variants: { grupo: { opcao: ... } }` de blocos cva. */
function extrairVariantes(fonte: string): Record<string, string[]> {
  const resultado: Record<string, string[]> = {};
  const inicio = fonte.indexOf("variants: {");
  if (inicio === -1) return resultado;

  let i = inicio + "variants: {".length;
  let profundidade = 1;
  const corpo: string[] = [];
  while (i < fonte.length && profundidade > 0) {
    const c = fonte[i];
    if (c === undefined) break;
    if (c === "{") profundidade++;
    else if (c === "}") profundidade--;
    if (profundidade > 0) corpo.push(c);
    i++;
  }
  const texto = corpo.join("");

  // Grupos de primeiro nível dentro de `variants`.
  let j = 0;
  while (j < texto.length) {
    const abre = texto.indexOf("{", j);
    if (abre === -1) break;
    const rotulo = /([A-Za-z0-9_]+)\s*:\s*$/.exec(texto.slice(j, abre));
    let prof = 1;
    let k = abre + 1;
    const inner: string[] = [];
    while (k < texto.length && prof > 0) {
      const c = texto[k];
      if (c === undefined) break;
      if (c === "{") prof++;
      else if (c === "}") prof--;
      if (prof > 0) inner.push(c);
      k++;
    }
    if (rotulo) {
      const opcoes = new Set<string>();
      for (const m of inner.join("").matchAll(/(?:^|\n)\s*"?([A-Za-z0-9_-]+)"?\s*:/g)) {
        const opcao = m[1];
        if (opcao) opcoes.add(opcao);
      }
      const grupo = rotulo[1];
      if (opcoes.size > 0 && grupo) resultado[grupo] = [...opcoes];
    }
    j = k;
  }
  return resultado;
}

function extrairDoc(fonte: string): string | undefined {
  const m = /\/\*\*([\s\S]*?)\*\//.exec(fonte);
  if (m?.[1] === undefined) return undefined;
  return m[1]
    .split("\n")
    .map((linha) => linha.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 400);
}

export function lerCatalogo(cwd: string): ComponenteCatalogo[] {
  const base = join(cwd, RAIZ_COMPONENTES);
  return listarArquivos(base)
    .map((caminho) => {
      const fonte = readFileSync(caminho, "utf8");
      const rel = relative(cwd, caminho);
      const semExt = rel.replace(/\.tsx?$/, "").replace(/^src[\\/]/, "");
      const { exports, tipos } = extrairExports(fonte);
      return {
        arquivo: rel.split(sep).join("/"),
        importPath: `@/${semExt.split(sep).join("/")}`,
        camada: rel.split(sep)[2] ?? "componentes",
        exports,
        tipos,
        variantes: extrairVariantes(fonte),
        doc: extrairDoc(fonte),
      } satisfies ComponenteCatalogo;
    })
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
}

/** Resumo compacto para injeção no system prompt. */
export function resumirCatalogo(componentes: ComponenteCatalogo[]): string {
  const porCamada = new Map<string, string[]>();
  for (const componente of componentes) {
    const nomes = componente.exports.filter((nome) => /^[A-Z]/.test(nome));
    if (nomes.length === 0) continue;
    const variantes = Object.entries(componente.variantes)
      .map(([grupo, opcoes]) => `${grupo}=${opcoes.join("|")}`)
      .join(" ");
    const linha = `- ${nomes.join(", ")} — \`${componente.importPath}\`${variantes ? ` (${variantes})` : ""}`;
    const lista = porCamada.get(componente.camada) ?? [];
    lista.push(linha);
    porCamada.set(componente.camada, lista);
  }
  return [...porCamada.entries()]
    .map(([camada, linhas]) => `**${camada}**\n${linhas.join("\n")}`)
    .join("\n\n");
}
