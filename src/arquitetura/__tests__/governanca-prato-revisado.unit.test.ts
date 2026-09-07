import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  actionsComConstrucaoLiteralDeItem,
  ehArquivoDeServerAction,
} from "../governanca-prato-revisado";

/** Todos os `.ts`/`.tsx` de `src/app`, onde as server actions moram. */
function arquivosDeApp(cwd: string): { caminho: string; fonte: string }[] {
  const raiz = join(cwd, "src/app");
  const resultado: { caminho: string; fonte: string }[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        percorrer(caminho);
        continue;
      }
      if (!/\.tsx?$/.test(entrada.name)) continue;
      if (/\.(test|spec)\.tsx?$/.test(entrada.name)) continue;
      resultado.push({
        caminho: caminho.slice(cwd.length + 1).split("\\").join("/"),
        fonte: readFileSync(caminho, "utf8"),
      });
    }
  };
  percorrer(raiz);
  return resultado;
}

describe("governança do Prato revisado", () => {
  const arquivos = arquivosDeApp(process.cwd());

  it("reconhece o arquivo de server action pela diretiva", () => {
    expect(ehArquivoDeServerAction('"use server";\n')).toBe(true);
    expect(ehArquivoDeServerAction("export const x = 1;\n")).toBe(false);
  });

  it("acusa a action que constrói ItemPrato chamando os construtores direto", () => {
    expect(
      actionsComConstrucaoLiteralDeItem([
        {
          caminho: "actions.ts",
          fonte: `"use server";
import { itemManual } from "@/domain/alimentos/prato";
export async function registrar(nome: string) {
  return itemManual({ nome, quantidade: 1, unidade: "porção", calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0 });
}`,
        },
      ]),
    ).toEqual([
      "actions.ts constrói ItemPrato direto: declare o Prato revisado e a origem com reconstruirPratoRevisado",
    ]);
  });

  it("nenhuma server action de src/app constrói ItemPrato direto", () => {
    expect(actionsComConstrucaoLiteralDeItem(arquivos)).toEqual([]);
  });
});
