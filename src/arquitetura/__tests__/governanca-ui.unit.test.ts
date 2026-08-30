import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lerCatalogo } from "../catalogo-ui";
import {
  CAMADAS_DE_COMPONENTE,
  caminhoDaStory,
  componentesDoArquivo,
  componentesForaDoCatalogo,
  validarComponenteDeTela,
  validarGaleria,
} from "../governanca-ui";

/** Todos os `.tsx` de `src/app`, para a checagem de composição das telas. */
function arquivosDeTela(cwd: string): { caminho: string; fonte: string }[] {
  const raiz = join(cwd, "src/app");
  const resultado: { caminho: string; fonte: string }[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        percorrer(caminho);
        continue;
      }
      if (!entrada.name.endsWith(".tsx")) continue;
      if (/\.(test|spec|stories)\.tsx$/.test(entrada.name)) continue;
      resultado.push({
        caminho: caminho.slice(cwd.length + 1).split("\\").join("/"),
        fonte: readFileSync(caminho, "utf8"),
      });
    }
  };
  percorrer(raiz);
  return resultado;
}

describe("governança de composição das telas", () => {
  it("exige story e teste para uma nova composição de tela", () => {
    expect(
      validarComponenteDeTela({
        nome: "PainelNovo",
        fonteStory: "<CabecalhoTela />",
        fontesTestes: ["describe('CabecalhoTela', () => {})"],
      }),
    ).toEqual([
      "PainelNovo não é renderizado em nenhuma story",
      "PainelNovo não possui teste de contrato",
    ]);
  });

  it("aponta o arquivo de story ausente ao lado do componente", () => {
    expect(
      validarGaleria({
        componentes: [
          {
            arquivo: "src/components/tela/painel-novo.tsx",
            camada: "tela",
            exports: ["PainelNovo"],
            tipos: [],
          },
        ],
        stories: new Map(),
        fontesTestes: [],
      }),
    ).toEqual([
      "src/components/tela/painel-novo.tsx não possui src/components/tela/painel-novo.stories.tsx",
    ]);
  });

  it("não cobra teste de contrato de primitivo shadcn", () => {
    expect(
      validarComponenteDeTela({
        nome: "Switch",
        camada: "ui",
        fonteStory: "<Switch />",
        fontesTestes: [],
      }),
    ).toEqual([]);
  });

  it("não cobra story de tipo, constante ou helper", () => {
    expect(
      componentesDoArquivo({
        exports: ["GraficoTendencia", "Serie", "MACROS", "calcularDelta"],
        tipos: ["Serie"],
      }),
    ).toEqual(["GraficoTendencia"]);
  });

  /**
   * O invariante que sustenta a galeria: nenhum componente do catálogo
   * fica sem demonstração no Storybook. Falha aqui é sinal de que um
   * componente foi criado sem entrar na galeria — não de que o teste
   * precisa de mais uma exceção.
   */
  it("mantém todo componente do catálogo visível no Storybook e testado", () => {
    const cwd = process.cwd();
    const componentes = lerCatalogo(cwd);

    const stories = new Map<string, string>();
    for (const componente of componentes) {
      const caminho = caminhoDaStory(componente.arquivo);
      const absoluto = join(cwd, caminho);
      if (existsSync(absoluto)) {
        stories.set(caminho, readFileSync(absoluto, "utf8"));
      }
    }

    const fontesTestes = CAMADAS_DE_COMPONENTE.flatMap((camada) => {
      const dir = join(cwd, "src/components", camada, "__tests__");
      if (!existsSync(dir)) return [];
      return readdirSync(dir).map((arquivo) =>
        readFileSync(join(dir, arquivo), "utf8"),
      );
    });

    expect(
      validarGaleria({ componentes, stories, fontesTestes }),
    ).toEqual([]);
  });

  /**
   * Uma tela é composição, não lugar de definir componente: o que nasce
   * dentro de `src/app/**` escapa do catálogo, do Storybook e da
   * cobrança de teste acima.
   */
  it("aponta componente definido dentro da pasta de uma rota", () => {
    expect(
      componentesForaDoCatalogo([
        {
          caminho: "src/app/(app)/diario/painel-macros.tsx",
          fonte: "export function PainelDeMacros() { return null; }",
        },
        {
          caminho: "src/app/(app)/diario/page.tsx",
          fonte: "export default function DiarioPage() { return null; }",
        },
      ]),
    ).toEqual([
      "src/app/(app)/diario/painel-macros.tsx define um componente dentro da rota: mova-o para src/components/** com story e teste",
    ]);
  });

  it("mantém as telas como composição de componentes do catálogo", () => {
    expect(componentesForaDoCatalogo(arquivosDeTela(process.cwd()))).toEqual([]);
  });
});
