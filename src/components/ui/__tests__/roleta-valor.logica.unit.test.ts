import { describe, expect, it } from "vitest";

import {
  aplicarInercia,
  arredondarAoPasso,
  indiceDoValor,
  indiceMaximo,
  janelaDeIndices,
  limitarPosicao,
  suavizarEncaixe,
  valorDoIndice,
  velocidadeDasAmostras,
  VELOCIDADE_MINIMA,
} from "../roleta-valor.logica";

describe("conversão entre índice e valor", () => {
  it("mantém a ida e volta exata em escala decimal", () => {
    // 0.1 não tem representação binária exata: sem o arredondamento ao passo,
    // 30 + 520 * 0.1 vira 82.00000000000001 e o formulário grava lixo.
    const indice = indiceDoValor(82, 30, 0.1);
    expect(indice).toBeCloseTo(520, 9);
    expect(valorDoIndice(520, 30, 0.1)).toBe(82);
  });

  it("conta os tiques da escala inteira", () => {
    expect(indiceMaximo(100, 250, 1)).toBe(150);
    expect(indiceMaximo(30, 300, 0.1)).toBe(2700);
  });

  it("arredonda ao passo preservando as casas do passo", () => {
    expect(arredondarAoPasso(82.04999, 0.1)).toBe(82);
    expect(arredondarAoPasso(174.6, 1)).toBe(175);
  });
});

describe("limites da escala", () => {
  it("prende a posição entre o primeiro e o último tique", () => {
    expect(limitarPosicao(-8, 150)).toBe(0);
    expect(limitarPosicao(999, 150)).toBe(150);
    expect(limitarPosicao(42.7, 150)).toBe(42.7);
  });

  it("recorta a janela visível nas bordas", () => {
    expect(janelaDeIndices(1, 3, 150)).toEqual([0, 1, 2, 3, 4]);
    expect(janelaDeIndices(149, 3, 150)).toEqual([146, 147, 148, 149, 150]);
    expect(janelaDeIndices(50, 2, 150)).toEqual([48, 49, 50, 51, 52]);
  });
});

describe("inércia", () => {
  it("decai com o tempo e termina abaixo do limiar", () => {
    const passo = aplicarInercia(10, 0.05, 16, 150);
    expect(passo.posicao).toBeCloseTo(10.8, 6);
    expect(Math.abs(passo.velocidade)).toBeLessThan(0.05);
    expect(passo.terminou).toBe(false);

    expect(aplicarInercia(10, VELOCIDADE_MINIMA / 2, 16, 150).terminou).toBe(true);
  });

  it("zera a velocidade ao bater na borda, sem quicar", () => {
    const passo = aplicarInercia(149, 0.5, 16, 150);
    expect(passo.posicao).toBe(150);
    expect(passo.velocidade).toBe(0);
    expect(passo.terminou).toBe(true);
  });

  it("é independente da taxa de quadros no decaimento", () => {
    const umQuadroLongo = aplicarInercia(0, 0.1, 32, 1000).velocidade;
    const doisCurtos = aplicarInercia(
      0,
      aplicarInercia(0, 0.1, 16, 1000).velocidade,
      16,
      1000,
    ).velocidade;
    expect(umQuadroLongo).toBeCloseTo(doisCurtos, 9);
  });
});

describe("encaixe", () => {
  it("parte da origem e chega ao destino desacelerando", () => {
    expect(suavizarEncaixe(0)).toBe(0);
    expect(suavizarEncaixe(1)).toBe(1);
    expect(suavizarEncaixe(0.5)).toBeGreaterThan(0.5);
    expect(suavizarEncaixe(1.4)).toBe(1);
    expect(suavizarEncaixe(-3)).toBe(0);
  });
});

describe("velocidade do gesto", () => {
  it("usa a janela inteira de amostras, não só o último quadro", () => {
    const velocidade = velocidadeDasAmostras([
      { posicao: 0, tempo: 0 },
      { posicao: 2, tempo: 50 },
      { posicao: 5, tempo: 100 },
    ]);
    expect(velocidade).toBeCloseTo(0.05, 9);
  });

  it("é nula quando não há deslocamento medível", () => {
    expect(velocidadeDasAmostras([])).toBe(0);
    expect(velocidadeDasAmostras([{ posicao: 3, tempo: 10 }])).toBe(0);
    expect(
      velocidadeDasAmostras([
        { posicao: 0, tempo: 10 },
        { posicao: 4, tempo: 10 },
      ]),
    ).toBe(0);
  });
});
