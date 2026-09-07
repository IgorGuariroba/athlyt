import { describe, expect, it } from "vitest";

import { itemEstimado, itemManual, type ItemPrato } from "@/domain/alimentos/prato";
import { interpretarItemPlanejadoLegadoNaBase, itemPlanejadoParaPrato } from "@/domain/plano/item-planejado";
import { reconstruirPratoRevisado } from "../prato-revisado";

describe("Prato revisado — portão único de reconstrução", () => {
  it("preserva a proveniência de base e ignora macros adulterados pelo cliente", () => {
    const aveia = itemPlanejadoParaPrato(interpretarItemPlanejadoLegadoNaBase("Aveia 60 g")!);
    const [reconstruido] = reconstruirPratoRevisado([{ ...aveia, calorias: 999 }], "texto");

    expect(reconstruido).toMatchObject({
      calorias: 236,
      origemDado: "base",
      alimentoId: "aveia-em-flocos",
      fonte: expect.stringContaining("TACO"),
    });
  });

  it("recusa item de base cujo alimentoId a tabela não reconhece", () => {
    const item: ItemPrato = {
      descricao: "Alimento fantasma 100 g",
      quantidade: 100,
      unidade: "g",
      alimentoId: "nao-existe-na-base",
      origemDado: "base",
      fonte: "TACO",
      versaoFonte: "1",
      confianca: "alta",
      calorias: 100, proteinaG: 1, carboidratosG: 1, gordurasG: 1, fibrasG: 1,
    };
    expect(() => reconstruirPratoRevisado([item], "texto")).toThrow(/não consegui validar/i);
  });

  it("item estimado conserva a origem que já carregava, mesmo com outra origem de tela", () => {
    const manga = itemEstimado({
      descricao: "Manga", quantidade: 100,
      calorias: 65, proteinaG: 1, carboidratosG: 15, gordurasG: 0, fibrasG: 2,
      confianca: "alta", modelo: "modelo-x", origemEstimativa: "foto",
    });

    const [reconstruido] = reconstruirPratoRevisado([manga], "texto");
    expect(reconstruido!.fonte).toBe("Estimativa por foto");
  });

  it("item estimado cuja fonte não corresponde a nenhuma origem conhecida cai na origem da tela", () => {
    const semOrigem = itemEstimado({
      descricao: "Suco", quantidade: 200, unidade: "ml",
      calorias: 90, proteinaG: 0, carboidratosG: 22, gordurasG: 0, fibrasG: 0,
      confianca: "media", modelo: "modelo-x",
    });
    // Simula um item cuja fonte não bate com nenhuma de FONTE_ESTIMATIVA
    // (ex.: registro legado). Só nesse caso o default da tela se aplica.
    const fonteNaoReconhecida = { ...semOrigem, fonte: "Fonte desconhecida" };

    const [reconstruido] = reconstruirPratoRevisado([fonteNaoReconhecida], "audio");
    expect(reconstruido!.fonte).toBe("Estimativa por áudio descrito");
  });

  it("item manual tem a descrição aparada antes de virar nome: o sufixo não se acumula", () => {
    const item = itemManual({
      nome: "Marmita da firma",
      quantidade: 1,
      unidade: "porção",
      calorias: 700, proteinaG: 40, carboidratosG: 70, gordurasG: 25, fibrasG: 6,
    });
    // item.descricao já é "Marmita da firma 1 porção" — o payload que
    // chega do cliente é a string inteira, sufixo incluído. Sem aparar
    // antes de reconstruir, o sufixo se acumularia ("...1 porção 1
    // porção").
    const [reconstruido] = reconstruirPratoRevisado([item], "texto");
    expect(reconstruido!.descricao).toBe("Marmita da firma 1 porção");
  });

  it("recusa item sem quantidade em vez de converter undefined em gramas", () => {
    expect(() =>
      reconstruirPratoRevisado([{ descricao: "Aveia" } as unknown as ItemPrato], "texto"),
    ).toThrow("Quantidade fora do intervalo aceito");
  });

  it("recusa quantidade menor que 1", () => {
    const item = itemManual({
      nome: "Água", quantidade: 0.5, unidade: "ml",
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });
    expect(() => reconstruirPratoRevisado([item], "texto")).toThrow(
      "Quantidade fora do intervalo aceito",
    );
  });

  it("recusa quantidade acima de 3000", () => {
    const item = itemManual({
      nome: "Água", quantidade: 5000, unidade: "ml",
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });
    expect(() => reconstruirPratoRevisado([item], "texto")).toThrow(
      "Quantidade fora do intervalo aceito",
    );
  });

  it("recusa macros adulterados acima do teto aceito", () => {
    const item = itemManual({
      nome: "Bomba calórica", quantidade: 1, unidade: "porção",
      calorias: 999999, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });
    expect(() => reconstruirPratoRevisado([item], "texto")).toThrow(/calorias.*intervalo/i);
  });

  it("recusa item de origem desconhecida em vez de aceitar macros do cliente", () => {
    const item = { ...itemManual({
      nome: "Adulterado", quantidade: 1, unidade: "porção",
      calorias: 10, proteinaG: 1, carboidratosG: 1, gordurasG: 1, fibrasG: 1,
    }), origemDado: "desconhecida" } as unknown as ItemPrato;
    expect(() => reconstruirPratoRevisado([item], "texto")).toThrow(/origem.*inválida/i);
  });

  it("array vazio é erro, não Prato vazio", () => {
    expect(() => reconstruirPratoRevisado([], "texto")).toThrow(/ao menos um item/i);
  });
});
