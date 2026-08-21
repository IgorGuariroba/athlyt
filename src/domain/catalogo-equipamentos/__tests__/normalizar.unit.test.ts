import { describe, expect, it } from "vitest";
import { normalizarEquipamento } from "../normalizar";

describe("normalizarEquipamento", () => {
  it("converte equipamento externo em tipo estável do catálogo Athlyt", () => {
    expect(
      normalizarEquipamento({
        id: "Leverage Machine",
        name: "Leverage Machine",
        exercises: ["Leg Press", "Hack Squat"],
        source: "exercisedb",
      }),
    ).toEqual({
      slug: "leverage-machine",
      nome: "Leverage Machine",
      categoria: "machine",
      exerciciosExternos: ["Leg Press", "Hack Squat"],
      fonte: "exercisedb",
    });
  });

  it("normaliza aliases conhecidos sem criar tipos duplicados", () => {
    expect(
      normalizarEquipamento({
        id: "smith machine",
        name: "Smith Machine",
        exercises: [],
        source: "wger",
      }).slug,
    ).toBe("smith-machine");
  });
});
