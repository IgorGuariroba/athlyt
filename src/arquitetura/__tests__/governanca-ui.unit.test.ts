import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lerCatalogo } from "../../../.pi/extensions/ui-componentes/catalogo";
import { verificarConteudo } from "../../../.pi/extensions/ui-componentes/regras";
import {
  caminhoDaStory,
  componentesDoArquivo,
  validarComponenteDeTela,
  validarGaleria,
} from "../governanca-ui";

describe("governança de composição das telas", () => {
  it("rejeita Card estrutural importado diretamente por uma página", () => {
    const violacoes = verificarConteudo(
      'import { Card } from "@/components/ui/card";\n\nexport default function Page() { return <Card />; }',
    );

    expect(violacoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ regra: "composicao-crua" }),
      ]),
    );
  });

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

    const fontesTestes = ["tela", "ui", "fotos"].flatMap((camada) => {
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
});
