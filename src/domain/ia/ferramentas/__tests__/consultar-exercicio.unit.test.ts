import { describe, expect, it, vi } from "vitest";

const buscar = vi.fn();
vi.mock("@/infra/exercisedb", () => ({
  criarClienteExerciseDB: () => ({ buscar }),
}));

const { consultarExercicio } = await import("../consultar-exercicio");

describe("consultarExercicio (ferramenta de leitura da ExerciseDB)", () => {
  it("retorna dados normalizados (musculos/equipamentos/instrucoes) do exercicio", async () => {
    buscar.mockResolvedValue([
      {
        exerciseId: "EIeI8Vf",
        nome: "barbell bench press",
        gifUrl: "http://exemplo/ei.gif",
        musculosAlvo: ["pectorals"],
        musculosSecundarios: ["triceps", "shoulders"],
        equipamentos: ["barbell"],
        instrucoes: ["Step:1 Deite no banco.", "Step:2 Empurre a barra."],
      },
    ]);

    const resultado = await consultarExercicio.execute({ termo: "barbell bench press", limite: 1 }, { toolCallId: "teste" } as never);

    expect(buscar).toHaveBeenCalledWith("barbell bench press", 1);
    expect(resultado).toEqual([
      {
        exerciseId: "EIeI8Vf",
        nome: "barbell bench press",
        gifUrl: "http://exemplo/ei.gif",
        musculosAlvo: ["pectorals"],
        musculosSecundarios: ["triceps", "shoulders"],
        equipamentos: ["barbell"],
        instrucoes: ["Step:1 Deite no banco.", "Step:2 Empurre a barra."],
      },
    ]);
  });

  it("repassa o limite padrão quando não informado", async () => {
    buscar.mockResolvedValue([]);
    await consultarExercicio.execute({ termo: "pull-up" } as never, { toolCallId: "teste" } as never);
    expect(buscar).toHaveBeenCalledWith("pull-up", 3);
  });
});
