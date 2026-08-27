import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { COACH_LOCAL_VERSAO, orientarExercicio, sugerirCarga, avaliarCautela } from "../coach-local";
import type { ExercicioSessao, SerieSessao } from "../repositorio";

function serie(numero: number, valores: Partial<SerieSessao> = {}): SerieSessao {
  return {
    numero, repeticoesSugeridas: "8–10", cargaKg: null, cargaSugeridaKg: 40,
    melhorCargaAnteriorKg: 40, repeticoes: null, rir: 2, concluida: false, ...valores,
  };
}

function exercicio(series: SerieSessao[]): ExercicioSessao {
  return { exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", descansoSeg: 90, series };
}

describe("Coach Local", () => {
  it("sugere a carga de referência na primeira série", () => {
    const e = exercicio([serie(1), serie(2)]);
    expect(sugerirCarga(e, e.series[0])).toMatchObject({
      regra: "carga-primeira-serie", origem: "regra local", versao: COACH_LOCAL_VERSAO, cargaSugeridaKg: 40,
    });
  });

  it("sobe a carga quando a série anterior sobrou reserva", () => {
    const e = exercicio([serie(1, { concluida: true, cargaKg: 40, repeticoes: 10, rir: 4 }), serie(2)]);
    expect(sugerirCarga(e, e.series[1])).toMatchObject({ regra: "carga-rir-alto", cargaSugeridaKg: 42.5 });
  });

  it("reduz a carga quando a série anterior passou do alvo", () => {
    const e = exercicio([serie(1, { concluida: true, cargaKg: 40, repeticoes: 8, rir: 0 }), serie(2)]);
    expect(sugerirCarga(e, e.series[1])).toMatchObject({ regra: "carga-rir-baixo", cargaSugeridaKg: 37.5 });
  });

  it("mantém a carga quando a série anterior ficou no alvo", () => {
    const e = exercicio([serie(1, { concluida: true, cargaKg: 40, repeticoes: 9, rir: 2 }), serie(2)]);
    expect(sugerirCarga(e, e.series[1])).toMatchObject({ regra: "carga-manter", cargaSugeridaKg: 40 });
  });

  it("usa o RIR prescrito como alvo quando a referência histórica diverge", () => {
    const e = exercicio([
      serie(1, { concluida: true, cargaKg: 40, repeticoes: 9, rir: 3 }),
      serie(2, { rir: 1, rirPrescrito: 3 }),
    ]);

    expect(sugerirCarga(e, e.series[1])).toMatchObject({ regra: "carga-manter", cargaSugeridaKg: 40 });
  });

  it("alerta cautela após duas séries seguidas em falha", () => {
    const e = exercicio([
      serie(1, { concluida: true, cargaKg: 40, repeticoes: 6, rir: 0 }),
      serie(2, { concluida: true, cargaKg: 40, repeticoes: 5, rir: 0 }),
      serie(3),
    ]);
    expect(avaliarCautela(e)).toMatchObject({ regra: "cautela-falha-repetida", severidade: "cautela" });
    expect(orientarExercicio(e)[0].severidade).toBe("cautela");
  });

  it("não alerta quando as séries ficaram dentro da faixa", () => {
    const e = exercicio([
      serie(1, { concluida: true, cargaKg: 40, repeticoes: 9, rir: 1 }),
      serie(2, { concluida: true, cargaKg: 40, repeticoes: 8, rir: 0 }),
    ]);
    expect(avaliarCautela(e)).toBeNull();
  });

  it("não orienta exercício interrompido", () => {
    expect(orientarExercicio({ ...exercicio([serie(1, { concluida: true, cargaKg: 40, repeticoes: 8 })]), interrompido: true })).toEqual([]);
  });

  const serieArb = fc.record({
    cargaKg: fc.integer({ min: 0, max: 200 }),
    repeticoes: fc.integer({ min: 1, max: 20 }),
    rir: fc.integer({ min: 0, max: 5 }),
  });

  it("é determinístico e sempre rotula a origem como regra local", () => {
    fc.assert(fc.property(fc.array(serieArb, { minLength: 0, maxLength: 4 }), (feitas) => {
      const series = [
        ...feitas.map((v, i) => serie(i + 1, { ...v, concluida: true })),
        serie(feitas.length + 1),
      ];
      const e = exercicio(series);
      const primeira = orientarExercicio(e);
      expect(orientarExercicio(e)).toEqual(primeira);
      expect(primeira.every((o) => o.origem === "regra local" && o.versao === COACH_LOCAL_VERSAO)).toBe(true);
    }));
  });

  it("nunca sugere carga negativa nem fora de ±5% da anterior", () => {
    fc.assert(fc.property(serieArb, fc.integer({ min: 0, max: 5 }), (anterior, alvoRir) => {
      const e = exercicio([serie(1, { ...anterior, concluida: true }), serie(2, { rir: alvoRir })]);
      const { cargaSugeridaKg } = sugerirCarga(e, e.series[1]);
      expect(cargaSugeridaKg).toBeGreaterThanOrEqual(0);
      expect(cargaSugeridaKg!).toBeLessThanOrEqual(anterior.cargaKg * 1.05 + 2.5);
      expect(cargaSugeridaKg!).toBeGreaterThanOrEqual(anterior.cargaKg * 0.95 - 2.5);
    }));
  });
});
