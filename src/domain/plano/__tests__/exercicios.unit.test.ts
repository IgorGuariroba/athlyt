import { describe, expect, it } from "vitest";

import {
  EXERCICIOS,
  encontrarExercicio,
  equipamentosDesconhecidos,
  exercicioViavel,
  exerciciosElegiveis,
  regioesLesionadas,
  rotuloGrupoMuscular,
} from "../exercicios";

describe("catálogo de exercícios", () => {
  it("não cita equipamento fora do catálogo da triagem", () => {
    expect(equipamentosDesconhecidos()).toEqual([]);
  });

  it("tem ids únicos", () => {
    const ids = EXERCICIOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo exercício tem justificativa não vazia (user story 20)", () => {
    for (const exercicio of EXERCICIOS) {
      expect(exercicio.justificativa.length).toBeGreaterThan(20);
    }
  });

  it("todo exercício tem instrução de execução não vazia (Mídia de Execução, CONTEXT.md)", () => {
    for (const exercicio of EXERCICIOS) {
      expect(exercicio.comoExecutar.length).toBeGreaterThan(20);
    }
  });
});

describe("rotuloGrupoMuscular", () => {
  it("traduz cada grupo muscular do catálogo para pt-BR", () => {
    expect(rotuloGrupoMuscular("peito")).toBe("Peito");
    expect(rotuloGrupoMuscular("quadriceps")).toBe("Quadríceps");
    expect(rotuloGrupoMuscular("gluteos")).toBe("Glúteos");
  });
});

describe("exercicioViavel", () => {
  it("peso do corpo é viável sem nenhum equipamento", () => {
    const flexao = encontrarExercicio("flexao-de-braco")!;
    expect(exercicioViavel(flexao, [])).toBe(true);
  });

  it("exige o conjunto completo, não apenas um item dele", () => {
    const supino = encontrarExercicio("supino-barra")!;
    expect(exercicioViavel(supino, ["barra-olimpica", "anilhas"])).toBe(false);
    expect(
      exercicioViavel(supino, ["barra-olimpica", "anilhas", "banco-reto"]),
    ).toBe(true);
  });

  it("aceita qualquer um dos conjuntos alternativos", () => {
    const remada = encontrarExercicio("remada-maquina-sentada")!;
    expect(exercicioViavel(remada, ["remada-maquina"])).toBe(true);
    expect(exercicioViavel(remada, ["polia-baixa"])).toBe(true);
    expect(exercicioViavel(remada, ["halteres"])).toBe(false);
  });
});

describe("regioesLesionadas", () => {
  it("sem texto não exclui nada", () => {
    expect(regioesLesionadas(undefined)).toEqual([]);
    expect(regioesLesionadas("")).toEqual([]);
  });

  it("reconhece a região mesmo sem acento e com maiúsculas", () => {
    expect(regioesLesionadas("Dor no OMBRO direito")).toEqual(["ombro"]);
    expect(regioesLesionadas("condromalacia patelar")).toContain("joelho");
  });

  it("reconhece múltiplas regiões no mesmo texto", () => {
    expect(regioesLesionadas("hérnia de disco lombar e dor no joelho")).toEqual(
      expect.arrayContaining(["lombar", "joelho"]),
    );
  });

  it("texto sem termo conhecido não inventa região", () => {
    expect(regioesLesionadas("me sinto cansado às vezes")).toEqual([]);
  });
});

describe("exerciciosElegiveis", () => {
  const semEquipamento = {
    equipamentos: [],
    regioesLesionadas: [],
    modoConservador: false,
  };

  it("sem equipamento ainda devolve exercícios de peso do corpo", () => {
    const elegiveis = exerciciosElegiveis(semEquipamento);
    expect(elegiveis.length).toBeGreaterThan(0);
    expect(elegiveis.every((e) => e.requer.length === 0 || e.requer.some((c) => c.length === 0))).toBe(true);
  });

  it("exclui exercícios que carregam a região lesionada", () => {
    const comJoelho = exerciciosElegiveis({
      equipamentos: ["leg-press"],
      regioesLesionadas: ["joelho"],
      modoConservador: false,
    });
    expect(comJoelho.map((e) => e.id)).not.toContain("leg-press-45");
  });

  it("Modo Conservador não libera exercícios de técnica avançada", () => {
    const equipamentos = [
      "barra-olimpica",
      "anilhas",
      "rack-agachamento",
      "banco-reto",
    ];
    const completo = exerciciosElegiveis({
      equipamentos,
      regioesLesionadas: [],
      modoConservador: false,
    });
    const conservador = exerciciosElegiveis({
      equipamentos,
      regioesLesionadas: [],
      modoConservador: true,
    });

    expect(completo.map((e) => e.id)).toContain("agachamento-livre");
    expect(conservador.map((e) => e.id)).not.toContain("agachamento-livre");
    expect(conservador.every((e) => !e.exigeTecnicaAvancada)).toBe(true);
  });

  it("é determinística: mesma entrada, mesma ordem", () => {
    const entrada = {
      equipamentos: ["halteres", "banco-reto", "polia-alta"],
      regioesLesionadas: [],
      modoConservador: false,
    };
    expect(exerciciosElegiveis(entrada).map((e) => e.id)).toEqual(
      exerciciosElegiveis(entrada).map((e) => e.id),
    );
  });
});
