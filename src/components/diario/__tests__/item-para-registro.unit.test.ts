import { describe, expect, it } from "vitest";

import { itemEstimado } from "@/domain/alimentos/prato";
import { interpretarItemPlanejadoLegadoNaBase, itemPlanejadoParaPrato } from "@/domain/plano/item-planejado";
import { reconstruirItemParaRegistro } from "@/app/(app)/diario/registrar/item-para-registro";

describe("item revisado na fronteira de registro", () => {
  it("preserva a proveniência de base e ignora macros adulterados pelo cliente", () => {
    const aveia = itemPlanejadoParaPrato(interpretarItemPlanejadoLegadoNaBase("Aveia 60 g")!);
    const reconstruido = reconstruirItemParaRegistro({ ...aveia, calorias: 999 }, "texto");

    expect(reconstruido).toMatchObject({
      calorias: 236,
      origemDado: "base",
      alimentoId: "aveia-em-flocos",
      fonte: expect.stringContaining("TACO"),
    });
  });

  it("preserva a origem fotográfica de uma linha estimada", () => {
    const manga = itemEstimado({
      descricao: "Manga", quantidade: 100,
      calorias: 65, proteinaG: 1, carboidratosG: 15, gordurasG: 0, fibrasG: 2,
      confianca: "alta", modelo: "modelo-x", origemEstimativa: "foto",
    });

    const reconstruido = reconstruirItemParaRegistro(manga, "texto");
    expect(reconstruido.fonte).toBe("Estimativa por foto");
  });

  it("recusa item sem quantidade em vez de converter undefined em gramas", () => {
    expect(() => reconstruirItemParaRegistro({ descricao: "Aveia" } as never, "texto"))
      .toThrow("Quantidade fora do intervalo aceito");
  });
});
