import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { GrupoMuscular } from "@/domain/plano/exercicios";
import { DiagramaMuscular, rotuloVistaDoGrupo } from "../diagrama-muscular";

afterEach(cleanup);

const TODOS_OS_GRUPOS: readonly GrupoMuscular[] = [
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "quadriceps",
  "posteriores",
  "gluteos",
  "panturrilhas",
  "core",
];

/**
 * Diagrama de músculos-alvo da Mídia de Execução (CONTEXT.md): segunda
 * metade do fallback, ao lado do texto de "como executar". Cada grupo
 * pertence a exatamente uma vista (frontal ou posterior), porque
 * misturar as duas obrigaria o atleta a decidir qual lado olhar.
 */
describe("DiagramaMuscular", () => {
  it.each(TODOS_OS_GRUPOS)("renderiza uma silhueta com pelo menos uma forma destacada para %s", (grupo) => {
    const { container } = render(<DiagramaMuscular grupo={grupo} />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector(".fill-on-surface-strong")).not.toBeNull();
  });

  it("é decorativo: fica fora da árvore de acessibilidade", () => {
    const { container } = render(<DiagramaMuscular grupo="peito" />);

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("rotuloVistaDoGrupo", () => {
  it("classifica peito, ombros, bíceps, quadríceps e core na vista frontal", () => {
    for (const grupo of ["peito", "ombros", "biceps", "quadriceps", "core"] as const) {
      expect(rotuloVistaDoGrupo(grupo)).toBe("Vista frontal");
    }
  });

  it("classifica costas, tríceps, glúteos, posteriores e panturrilhas na vista posterior", () => {
    for (const grupo of [
      "costas",
      "triceps",
      "gluteos",
      "posteriores",
      "panturrilhas",
    ] as const) {
      expect(rotuloVistaDoGrupo(grupo)).toBe("Vista posterior");
    }
  });
});
