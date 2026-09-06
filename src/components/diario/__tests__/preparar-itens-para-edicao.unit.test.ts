import { describe, expect, it, vi } from "vitest";

import { itemEstimado } from "@/domain/alimentos/prato";
import { prepararItensParaEdicao } from "@/app/(app)/diario/registrar/preparar-itens-para-edicao";

const macros = { calorias: 204, proteinaG: 16, carboidratosG: 19, gordurasG: 7, fibrasG: 2 };

describe("preparar itens antigos para edição", () => {
  it("reidrata o café recomendado pela base sem chamar a IA", async () => {
    const estimar = vi.fn();
    const resultado = await prepararItensParaEdicao([
      { descricao: "Aveia 60 g", ...macros },
      { descricao: "Leite 250 ml", ...macros },
      { descricao: "Ovos 2 un", ...macros },
    ], estimar);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.itens.map((item) => item.quantidade)).toEqual([60, 250, 100]);
    expect(resultado.itens.map((item) => item.unidade)).toEqual(["g", "ml", "g"]);
    expect(resultado.itens.map((item) => item.calorias)).toEqual([236, 153, 146]);
    expect(estimar).not.toHaveBeenCalled();
  });

  it("preserva item rico que já foi registrado por foto", async () => {
    const manga = itemEstimado({
      descricao: "Manga", quantidade: 100,
      calorias: 65, proteinaG: 1, carboidratosG: 15, gordurasG: 0, fibrasG: 2,
      confianca: "alta", modelo: "modelo-x",
    });
    const resultado = await prepararItensParaEdicao([manga], vi.fn());

    expect(resultado).toEqual({ ok: true, itens: [manga] });
  });

  it("manda somente itens sem correspondência segura ao fallback", async () => {
    const pao = itemEstimado({
      descricao: "Pão integral", quantidade: 50,
      calorias: 125, proteinaG: 5, carboidratosG: 22, gordurasG: 2, fibrasG: 3,
      confianca: "media", modelo: "modelo-x", origemEstimativa: "texto",
    });
    const estimar = vi.fn(() => Promise.resolve({ ok: true as const, itens: [pao] }));

    const resultado = await prepararItensParaEdicao([
      { descricao: "Aveia 60 g", ...macros },
      { descricao: "Pão integral 2 fatias", ...macros },
    ], estimar);

    expect(estimar).toHaveBeenCalledWith(["Pão integral 2 fatias"]);
    expect(resultado.ok && resultado.itens.map((item) => item.descricao)).toEqual([
      "Aveia em flocos 60 g",
      "Pão integral 50 g",
    ]);
  });

  it("falha por inteiro se a IA não preparar os itens restantes", async () => {
    const resultado = await prepararItensParaEdicao(
      [{ descricao: "Receita da casa 1 porção", ...macros }],
      () =>
        Promise.resolve({
          ok: false as const,
          erro: "Não consegui preparar os alimentos antigos para edição.",
        }),
    );

    expect(resultado).toEqual({
      ok: false,
      erro: "Não consegui preparar os alimentos antigos para edição.",
    });
  });
});
