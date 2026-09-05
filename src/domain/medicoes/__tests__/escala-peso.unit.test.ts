import { describe, expect, it } from "vitest";

import { calcularEscalaDePeso } from "../plano-peso";

const passos = (marcas: readonly number[]) =>
  marcas.slice(1).map((valor, i) => Number((valor - marcas[i]!).toFixed(10)));

describe("calcularEscalaDePeso", () => {
  it("usa marcas redondas que enquadram os dados", () => {
    const escala = calcularEscalaDePeso({ minKg: 78.1, maxKg: 90.4 });

    // Passo 5, e não 3: contar de 3 em 3 exige aritmética consciente.
    expect(escala.marcas).toEqual([75, 80, 85, 90, 95]);
    expect(escala.pisoKg).toBe(75);
    expect(escala.tetoKg).toBe(95);
  });

  it("arredonda para fora: nenhum dado fica fora da escala", () => {
    for (const [minKg, maxKg] of [
      [78.1, 90.4],
      [63.7, 64.2],
      [99.9, 130.1],
      [45, 45],
    ] as const) {
      const escala = calcularEscalaDePeso({ minKg, maxKg });
      expect(escala.pisoKg).toBeLessThanOrEqual(minKg);
      expect(escala.tetoKg).toBeGreaterThanOrEqual(maxKg);
    }
  });

  it("mantém espaçamento uniforme entre as marcas", () => {
    for (const [minKg, maxKg] of [
      [78.1, 90.4],
      [70, 112],
      [81.2, 83.9],
    ] as const) {
      const escala = calcularEscalaDePeso({ minKg, maxKg });
      const distintos = new Set(passos(escala.marcas));
      expect(distintos.size).toBe(1);
    }
  });

  it("escolhe passos legíveis — múltiplos de 1, 2, 2,5, 5 ou 10", () => {
    for (let min = 60; min < 100; min += 1.3) {
      const escala = calcularEscalaDePeso({ minKg: min, maxKg: min + 11.7 });
      const [passo] = passos(escala.marcas);
      if (!passo) throw new Error("sem passos");
      const mantissa = passo / 10 ** Math.floor(Math.log10(passo));
      expect([1, 2, 2.5, 5, 10]).toContain(Number(mantissa.toFixed(10)));
    }
  });

  it("produz de 3 a 6 marcas, para caber em 144px de altura", () => {
    for (let amplitude = 0.4; amplitude < 40; amplitude += 0.37) {
      const escala = calcularEscalaDePeso({ minKg: 80, maxKg: 80 + amplitude });
      expect(escala.marcas.length).toBeGreaterThanOrEqual(3);
      expect(escala.marcas.length).toBeLessThanOrEqual(6);
    }
  });

  it("não dramatiza oscilação pequena: cobre ao menos 2 kg", () => {
    // 300 g ocupando a altura inteira faria manutenção parecer
    // transformação. O piso de amplitude é o que segura a percepção
    // ao trocar 30/90/120.
    for (const [minKg, maxKg] of [
      [85, 85.3],
      [84.9, 85.1],
      [85, 85],
    ] as const) {
      const escala = calcularEscalaDePeso({ minKg, maxKg });
      expect(escala.tetoKg - escala.pisoKg).toBeGreaterThanOrEqual(2);
    }
  });

  it("expande em torno do centro, sem colar a série numa extremidade", () => {
    const escala = calcularEscalaDePeso({ minKg: 85, maxKg: 85.3 });
    const centroDados = (85 + 85.3) / 2;
    const centroEscala = (escala.pisoKg + escala.tetoKg) / 2;

    expect(Math.abs(centroEscala - centroDados)).toBeLessThanOrEqual(0.5);
  });

  it("o piso de amplitude não interfere quando a faixa real já é maior", () => {
    expect(calcularEscalaDePeso({ minKg: 78.1, maxKg: 90.4 }).marcas).toEqual([
      75, 80, 85, 90, 95,
    ]);
  });

  it("não colapsa quando peso e meta coincidem", () => {
    const escala = calcularEscalaDePeso({ minKg: 80, maxKg: 80 });

    expect(escala.tetoKg).toBeGreaterThan(escala.pisoKg);
    expect(escala.marcas.length).toBeGreaterThanOrEqual(3);
  });

  it("é estável: a mesma faixa arredondada devolve as mesmas marcas", () => {
    // Trocar o recorte não pode remexer a grade enquanto os dados
    // ficarem entre as mesmas marcas — é o que dá referência estável
    // ao comparar 30, 90 e 120 dias.
    const a = calcularEscalaDePeso({ minKg: 78.4, maxKg: 89.6 });
    const b = calcularEscalaDePeso({ minKg: 76.2, maxKg: 88.1 });

    expect(a.marcas).toEqual(b.marcas);
    expect(a.marcas).toEqual([75, 80, 85, 90]);
  });
});
