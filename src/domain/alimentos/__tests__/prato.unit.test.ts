import { describe, expect, it } from "vitest";
import {
  adicionarAoPrato,
  descricaoSemQuantidade,
  itemDeAlimento,
  itemEstimado,
  itemManual,
  macrosDesatualizados,
  nomeDoItem,
  origemDaEstimativa,
  reescalarItem,
  reestimarMacros,
  removerDoPrato,
  renomearItem,
  subtotalDoPrato,
} from "../prato";
import { rotuloDeConfianca } from "../proveniencia";

const arroz = itemDeAlimento("arroz-branco-cozido", { quantidade: 150, unidade: "g" });
const frango = itemDeAlimento("peito-frango-grelhado", { quantidade: 1, unidade: "filé médio" });

describe("Prato — montagem de múltiplos alimentos", () => {
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

/**
 * Líquido se mede em mililitros. O caso guia é o do refrigerante
 * fotografado: a estimativa vem como "Coca-Cola 250 ml" e o atleta
 * corrige o alimento para a versão zero.
 */
describe("unidade do item estimado", () => {
  const refrigerante = itemEstimado({
    descricao: "Coca-Cola",
    quantidade: 250,
    unidade: "ml",
    calorias: 105, proteinaG: 0, carboidratosG: 26, gordurasG: 0, fibrasG: 0,
    confianca: "media",
    modelo: "google/gemini-2.5-flash-lite",
  });

  it("bebida guarda mililitros, e a descrição os declara", () => {
    expect(refrigerante.unidade).toBe("ml");
    expect(refrigerante.descricao).toBe("Coca-Cola 250 ml");
  });

  it("grama continua o padrão de quem não declara unidade", () => {
    // Registro já gravado antes das unidades não pode ser reinterpretado
    // como volume só porque o campo passou a existir.
    const arrozEstimado = itemEstimado({
      descricao: "Arroz branco cozido",
      quantidade: 150,
      calorias: 193, proteinaG: 4, carboidratosG: 42, gordurasG: 0, fibrasG: 2,
      confianca: "media", modelo: "m",
    });
    expect(arrozEstimado.unidade).toBe("g");
    expect(arrozEstimado.descricao).toBe("Arroz branco cozido 150 g");
  });

  it("renomear preserva a quantidade de um item em ml", () => {
    // Antes das unidades o sufixo só era recolocado para gramas, e
    // renomear uma bebida apagava a quantidade da descrição.
    const corrigido = renomearItem(refrigerante, "Coca-Cola Zero");
    expect(corrigido.descricao).toBe("Coca-Cola Zero 250 ml");
    expect(corrigido.quantidade).toBe(250);
    expect(corrigido.unidade).toBe("ml");
  });

  it("renomear não mexe nos macros: dizer o que era não é dizer quanto era", () => {
    const corrigido = renomearItem(refrigerante, "Coca-Cola Zero");
    expect(corrigido.calorias).toBe(105);
    expect(macrosDesatualizados(corrigido, "Coca-Cola")).toBe(true);
  });

  it("reescalar mantém a unidade em vez de normalizar para grama", () => {
    // Corrigir 250 para 350 numa lata fala dos mesmos mililitros;
    // reescrever a unidade converteria volume em massa em silêncio.
    const lata = reescalarItem(refrigerante, 350);
    expect(lata.unidade).toBe("ml");
    expect(lata.descricao).toBe("Coca-Cola 350 ml");
    expect(lata.calorias).toBe(147);
  });

  it("a linha recalculada deixa de dizer que veio da foto", () => {
    // Os números passaram a vir do nome que o atleta digitou, e a foto
    // nunca mostrou a versão zero. Dizer "claros na foto" ali é a falha
    // de docs/memory/rotulo-de-confianca-esconde-a-origem.md.
    const zero = reestimarMacros(renomearItem(refrigerante, "Coca-Cola Zero"), {
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
      confianca: "alta", modelo: "m",
    });

    expect(origemDaEstimativa(zero, "foto")).toBe("texto");
    expect(rotuloDeConfianca(zero.confianca, zero.origemDado, origemDaEstimativa(zero, "foto")))
      .not.toMatch(/foto/i);
  });

  it("o item que ninguém recalculou continua sendo da foto", () => {
    expect(origemDaEstimativa(refrigerante, "foto")).toBe("foto");
  });

  it("o nome do item não carrega o sufixo, seja ele g ou ml", () => {
    expect(nomeDoItem(refrigerante)).toBe("Coca-Cola");
    expect(descricaoSemQuantidade("Arroz branco cozido 150 g")).toBe("Arroz branco cozido");
    expect(descricaoSemQuantidade("Suco de laranja 300 ml")).toBe("Suco de laranja");
  });
});
