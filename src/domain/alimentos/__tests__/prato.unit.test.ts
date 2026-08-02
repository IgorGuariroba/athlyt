import { describe, expect, it } from "vitest";
import { adicionarAoPrato, itemDeAlimento, itemManual, removerDoPrato, subtotalDoPrato } from "../prato";

const arroz = itemDeAlimento("arroz-branco-cozido", { quantidade: 150, unidade: "g" });
const frango = itemDeAlimento("peito-frango-grelhado", { quantidade: 1, unidade: "filé médio" });

describe("Prato — montagem de múltiplos alimentos (tela 058)", () => {
  it("acumula itens preservando a ordem de adição", () => {
    const prato = adicionarAoPrato(adicionarAoPrato([], arroz), frango);
    expect(prato.map((i) => i.descricao)).toEqual([arroz.descricao, frango.descricao]);
  });

  it("subtotal soma energia e macros de todos os itens", () => {
    const prato = [arroz, frango];
    const subtotal = subtotalDoPrato(prato);
    expect(subtotal.calorias).toBe(arroz.calorias + frango.calorias);
    expect(subtotal.proteinaG).toBe(arroz.proteinaG + frango.proteinaG);
    expect(subtotal.fibrasG).toBe(arroz.fibrasG + frango.fibrasG);
  });

  it("prato vazio tem subtotal zerado, não indefinido", () => {
    expect(subtotalDoPrato([])).toEqual({
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });
  });

  it("o mesmo alimento pode entrar duas vezes: repetir não é erro", () => {
    const prato = adicionarAoPrato(adicionarAoPrato([], arroz), arroz);
    expect(prato).toHaveLength(2);
    expect(subtotalDoPrato(prato).calorias).toBe(arroz.calorias * 2);
  });

  it("remover tira apenas a ocorrência indicada", () => {
    const prato = [arroz, frango, arroz];
    const restante = removerDoPrato(prato, 0);
    expect(restante).toHaveLength(2);
    expect(restante[0].descricao).toBe(frango.descricao);
  });

  it("remover índice inexistente devolve o prato intacto", () => {
    expect(removerDoPrato([arroz], 5)).toEqual([arroz]);
  });
});

describe("proveniência dos itens do Prato", () => {
  it("item vindo da base carrega fonte e confiança do alimento", () => {
    expect(arroz.fonte).toMatch(/TBCA/);
    expect(arroz.confianca).toBe("alta");
    expect(arroz.alimentoId).toBe("arroz-branco-cozido");
  });

  it("item manual é marcado como entrada do usuário, com confiança menor", () => {
    const item = itemManual({
      nome: "Marmita da firma",
      quantidade: 1,
      unidade: "porção",
      calorias: 700, proteinaG: 40, carboidratosG: 70, gordurasG: 25, fibrasG: 6,
    });
    expect(item.origemDado).toBe("usuario");
    expect(item.confianca).toBe("baixa");
    expect(item.alimentoId).toBeNull();
    expect(item.descricao).toContain("Marmita da firma");
  });

  it("alimento inexistente falha em vez de gerar um item fantasma", () => {
    expect(() => itemDeAlimento("nao-existe", { quantidade: 1, unidade: "g" })).toThrow(/alimento/i);
  });
});
