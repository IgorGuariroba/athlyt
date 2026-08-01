import { describe, expect, it } from "vitest";
import {
  alternativasEquivalentes,
  motivoPersistente,
  type EntradaAlternativas,
} from "../substituicoes";

const base: EntradaAlternativas = {
  exercicioId: "supino-barra",
  motivo: "equipamento",
  equipamentos: ["halteres", "banco-reto", "supino-maquina", "polia-alta", "crossover"],
  regioesLesionadas: [],
  modoConservador: false,
};

describe("alternativasEquivalentes", () => {
  it("prioriza o mesmo padrão de movimento antes de outros do grupo", () => {
    const alternativas = alternativasEquivalentes(base);
    expect(alternativas.length).toBeGreaterThan(0);
    const indicePrimeiroAproximado = alternativas.findIndex((a) => !a.preservaEstimulo);
    if (indicePrimeiroAproximado >= 0) {
      expect(alternativas.slice(0, indicePrimeiroAproximado).every((a) => a.preservaEstimulo)).toBe(true);
    }
    expect(alternativas[0]).toEqual(
      expect.objectContaining({ exercicioId: "supino-halteres", preservaEstimulo: true }),
    );
  });

  it("nunca oferece o próprio exercício nem os que já estão no treino", () => {
    const alternativas = alternativasEquivalentes({
      ...base,
      exerciciosNoTreino: ["supino-barra", "supino-halteres"],
    });
    expect(alternativas.map((a) => a.exercicioId)).not.toContain("supino-barra");
    expect(alternativas.map((a) => a.exercicioId)).not.toContain("supino-halteres");
  });

  it("respeita o equipamento declarado", () => {
    const semAcademia = alternativasEquivalentes({ ...base, equipamentos: [] });
    expect(semAcademia.map((a) => a.exercicioId)).toEqual(["flexao-de-braco"]);
  });

  it("exclui exercícios que carregam a região dolorida relatada agora", () => {
    const comDorNoOmbro = alternativasEquivalentes({
      ...base,
      motivo: "dor",
      regioesDoloridas: ["ombro"],
    });
    expect(comDorNoOmbro.map((a) => a.exercicioId)).not.toContain("supino-halteres");
    expect(comDorNoOmbro.map((a) => a.exercicioId)).not.toContain("crucifixo-cabo");
    expect(comDorNoOmbro.map((a) => a.exercicioId)).toContain("supino-maquina-peito");
  });

  it("não sugere técnica avançada em Modo Conservador", () => {
    const conservador = alternativasEquivalentes({
      ...base,
      exercicioId: "supino-halteres",
      equipamentos: ["barra-olimpica", "anilhas", "banco-reto"],
      modoConservador: true,
    });
    expect(conservador.map((a) => a.exercicioId)).not.toContain("supino-barra");
  });

  it("toda alternativa explica por que foi sugerida", () => {
    for (const alternativa of alternativasEquivalentes(base)) {
      expect(alternativa.justificativa.length).toBeGreaterThan(20);
    }
  });

  it("devolve lista vazia para exercício fora do catálogo", () => {
    expect(alternativasEquivalentes({ ...base, exercicioId: "inexistente" })).toEqual([]);
  });
});

describe("motivoPersistente", () => {
  it("equipamento e dor valem para as próximas sessões; preferência é pontual", () => {
    expect(motivoPersistente("equipamento")).toBe(true);
    expect(motivoPersistente("dor")).toBe(true);
    expect(motivoPersistente("preferencia")).toBe(false);
  });
});
