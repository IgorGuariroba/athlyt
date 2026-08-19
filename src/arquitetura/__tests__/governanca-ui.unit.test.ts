import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lerCatalogo } from "../../../.pi/extensions/ui-componentes/catalogo";
import { verificarConteudo } from "../../../.pi/extensions/ui-componentes/regras";
import {
  validarComponenteDeTela,
  validarNovosComponentesDeTela,
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

  it("exige demonstração e teste para uma nova composição de tela", () => {
    expect(
      validarComponenteDeTela({
        nome: "PainelNovo",
        fonteGaleria: "<CabecalhoTela />",
        fontesTestes: ["describe('CabecalhoTela', () => {})"],
      }),
    ).toEqual([
      "PainelNovo não possui demonstração em /design",
      "PainelNovo não possui teste de contrato",
    ]);
  });

  it("mantém novos exports públicos de tela visíveis e testados", () => {
    const cwd = process.cwd();
    const nomes = lerCatalogo(cwd)
      .filter((componente) => componente.camada === "tela")
      .flatMap((componente) => componente.exports);
    const diretorioTestes = join(cwd, "src/components/tela/__tests__");
    const fontesTestes = readdirSync(diretorioTestes).map((arquivo) =>
      readFileSync(join(diretorioTestes, arquivo), "utf8"),
    );
    // A galeria é a rota /design inteira, não só `page.tsx`: componentes
    // controlados só podem ser demonstrados a partir do arquivo de
    // cliente, e exigir o uso em `page.tsx` empurraria demonstração de
    // estado local para fora da galeria.
    const diretorioGaleria = join(cwd, "src/app/design");
    const fonteGaleria = readdirSync(diretorioGaleria)
      .filter((arquivo) => arquivo.endsWith(".tsx"))
      .map((arquivo) => readFileSync(join(diretorioGaleria, arquivo), "utf8"))
      .join("\n");

    expect(
      validarNovosComponentesDeTela({
        nomes,
        fonteGaleria,
        fontesTestes,
      }),
    ).toEqual([]);
  });
});
