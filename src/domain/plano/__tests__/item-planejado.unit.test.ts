import { describe, expect, it } from "vitest";

import {
  dentroDaToleranciaDaRefeicao,
  interpretarItemPlanejadoLegadoNaBase,
  itemPlanejadoParaPrato,
  type ItemPlanejado,
} from "../item-planejado";

/**
 * Seam do Item Planejado: strings antigas entram; item estruturado,
 * auditável e editável sai — ou a ausência diz que a IA é necessária.
 */
describe("Item Planejado", () => {
  it("interpreta gramas por sinônimo exato e calcula pela tabela", () => {
    const item = interpretarItemPlanejadoLegadoNaBase("Aveia 60 g");

    expect(item).toMatchObject({
      nome: "Aveia em flocos",
      porcaoDescrita: "60 g",
      quantidade: 60,
      unidade: "g",
      calorias: 236,
      proteinaG: 8,
      origemDado: "base",
      alimentoId: "aveia-em-flocos",
    });
  });

  it("converte unidades naturais para gramas sem perder a porção reconhecível", () => {
    const item = interpretarItemPlanejadoLegadoNaBase("Ovos 2 un");

    expect(item).toMatchObject({
      nome: "Ovo de galinha cozido",
      porcaoDescrita: "2 un",
      quantidade: 100,
      unidade: "g",
      calorias: 146,
      proteinaG: 13,
    });
  });

  it("mantém líquido em mililitros quando a base declara composição por volume", () => {
    const item = interpretarItemPlanejadoLegadoNaBase("Leite 250 ml");

    expect(item).toMatchObject({
      nome: "Leite integral",
      porcaoDescrita: "250 ml",
      quantidade: 250,
      unidade: "ml",
      calorias: 153,
    });
  });

  it("não promove busca parcial a valor de tabela", () => {
    expect(interpretarItemPlanejadoLegadoNaBase("Pão integral 2 fatias")).toBeNull();
    expect(interpretarItemPlanejadoLegadoNaBase("Carne bovina magra 150 g")).toBeNull();
  });

  it("não inventa quantidade quando a descrição antiga não traz porção", () => {
    expect(interpretarItemPlanejadoLegadoNaBase("Aveia")).toBeNull();
  });

  it("converte o item planejado para a forma editável sem apagar proveniência", () => {
    const planejado = interpretarItemPlanejadoLegadoNaBase("Aveia 60 g")!;
    const prato = itemPlanejadoParaPrato(planejado);

    expect(prato).toMatchObject({
      descricao: "Aveia em flocos 60 g",
      quantidade: 60,
      unidade: "g",
      origemDado: "base",
      fonte: expect.stringContaining("TACO"),
    });
  });

  it("valida energia em 10% e proteína em 15% da meta", () => {
    const item = (calorias: number, proteinaG: number): ItemPlanejado => ({
      nome: "Teste", porcaoDescrita: "100 g", quantidade: 100, unidade: "g",
      calorias, proteinaG, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
      alimentoId: null, origemDado: "estimativa-ia", fonte: "Estimativa do plano",
      versaoFonte: "modelo-x", confianca: "media",
    });

    expect(dentroDaToleranciaDaRefeicao([item(550, 34)], { calorias: 600, proteinaG: 40 })).toBe(true);
    expect(dentroDaToleranciaDaRefeicao([item(539, 40)], { calorias: 600, proteinaG: 40 })).toBe(false);
    expect(dentroDaToleranciaDaRefeicao([item(600, 33)], { calorias: 600, proteinaG: 40 })).toBe(false);
  });
});
