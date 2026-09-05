import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  rotaDoDestino,
  rotasParaInvalidar,
} from "@/app/_invalidacao/mapa";
import {
  actionsComInvalidacaoLiteral,
  actionsSemDestinoDeclarado,
  ehArquivoDeServerAction,
} from "../governanca-invalidacao";

/** Todos os `.ts` de `src/app`, onde as server actions moram. */
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
      if (!entrada.name.endsWith(".ts")) continue;
      if (/\.(test|spec)\.ts$/.test(entrada.name)) continue;
      resultado.push({
        caminho: caminho.slice(cwd.length + 1).split("\\").join("/"),
        fonte: readFileSync(caminho, "utf8"),
      });
    }
  };
  percorrer(raiz);
  return resultado;
}

const rotas = (...args: Parameters<typeof rotasParaInvalidar>) =>
  rotasParaInvalidar(...args).map(({ rota }) => rota);

describe("mapa de invalidação", () => {
  it("alcança o resumo pelo subtree da sessão", () => {
    expect(rotasParaInvalidar([{ fato: "sessao", sessaoId: "s1" }])).toContainEqual(
      { rota: "/sessao/s1", alcance: "layout" },
    );
  });

  it("leva o perfil às abas que dele derivam", () => {
    expect(rotas([{ fato: "perfil" }])).toEqual(
      expect.arrayContaining(["/treino", "/mais/perfil", "/mais/modo-conservador"]),
    );
  });

  it("invalida o destino do redirect mesmo fora do mapa do fato", () => {
    expect(
      rotas([{ fato: "diario" }], { destino: "/progresso/fotos" }),
    ).toContain("/progresso/fotos");
  });

  it("ignora a querystring do destino, que a rota não carrega", () => {
    expect(
      rotas([{ fato: "trilha" }], { destino: "/mais/objetivo?sucesso=Feito" }),
    ).toContain("/mais/objetivo");
    expect(rotaDoDestino("/mais/objetivo?sucesso=1#topo")).toBe("/mais/objetivo");
  });

  it("não rebaixa um subtree a página quando o destino repete a rota", () => {
    expect(
      rotasParaInvalidar([{ fato: "sessao", sessaoId: "s1" }], {
        destino: "/sessao/s1/resumo",
      }),
    ).toContainEqual({ rota: "/sessao/s1", alcance: "layout" });
  });

  it("não repete rota declarada por dois fatos", () => {
    const lista = rotas([{ fato: "diario" }, { fato: "medicoes" }]);
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("sem fato e sem destino, não invalida nada", () => {
    expect(rotasParaInvalidar([])).toEqual([]);
  });
});

describe("governança de invalidação", () => {
  const arquivos = arquivosDeApp(process.cwd());

  it("reconhece o arquivo de server action pela diretiva", () => {
    expect(ehArquivoDeServerAction('"use server";\n')).toBe(true);
    expect(ehArquivoDeServerAction("export const x = 1;\n")).toBe(false);
  });

  it("acusa a action que redireciona depois de invalidar sem destino", () => {
    expect(
      actionsSemDestinoDeclarado([
        {
          caminho: "actions.ts",
          fonte: `"use server";
export async function concluir(id: string) {
  invalidarLeituras([{ fato: "sessao", sessaoId: id }]);
  redirect(\`/sessao/\${id}/resumo\`);
}`,
        },
      ]),
    ).toEqual([
      "actions.ts: concluir redireciona depois de invalidar sem informar destino a invalidarLeituras",
    ]);
  });

  it("nenhuma server action chama revalidatePath direto", () => {
    expect(actionsComInvalidacaoLiteral(arquivos)).toEqual([]);
  });

  it("toda server action que redireciona depois de invalidar declara o destino", () => {
    expect(actionsSemDestinoDeclarado(arquivos)).toEqual([]);
  });
});
