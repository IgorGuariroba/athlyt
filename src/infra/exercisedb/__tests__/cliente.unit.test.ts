import { describe, expect, it, vi } from "vitest";
import { criarClienteExerciseDB } from "../index";

/**
 * Cliente da ExerciseDB (AscendAPI, tier V1 OSS) — camada de mídia da
 * Mídia de Execução. `fetch` é injetável para testar sem
 * rede; a base é `https://oss.exercisedb.dev/api/v1`.
 */
describe("criarClienteExerciseDB", () => {
  it("busca exercícios usando o parâmetro search (não q) e normaliza o retorno", async () => {
    const fetchFake = vi.fn((url: string | URL) => {
      const alvo = new URL(url);
      expect(alvo.pathname).toBe("/api/v1/exercises/search");
      expect(alvo.searchParams.get("search")).toBe("bench press");
      expect(alvo.searchParams.get("q")).toBeNull();
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                exerciseId: "EIeI8Vf",
                name: "barbell bench press",
                gifUrl: "https://static.exercisedb.dev/media/EIeI8Vf.gif",
                targetMuscles: ["pectorals"],
                bodyParts: ["chest"],
                equipments: ["barbell"],
                secondaryMuscles: ["triceps", "shoulders"],
                instructions: ["Step:1 Lie flat on a bench.", "Step:2 Grasp the barbell."],
              },
            ],
          }),
          { status: 200 },
        ),
      );
    });

    const cliente = criarClienteExerciseDB({ fetch: fetchFake as unknown as typeof fetch });
    const resultado = await cliente.buscar("bench press");

    expect(resultado).toEqual([
      {
        exerciseId: "EIeI8Vf",
        nome: "barbell bench press",
        gifUrl: "https://static.exercisedb.dev/media/EIeI8Vf.gif",
        musculosAlvo: ["pectorals"],
        musculosSecundarios: ["triceps", "shoulders"],
        equipamentos: ["barbell"],
        instrucoes: ["Lie flat on a bench.", "Grasp the barbell."],
      },
    ]);
  });

  it("porId devolve null quando a API responde NOT_FOUND", async () => {
    const fetchFake = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "Exercise with ID xyz not found." } }),
          { status: 404 },
        ),
      ),
    );

    const cliente = criarClienteExerciseDB({ fetch: fetchFake as unknown as typeof fetch });
    expect(await cliente.porId("xyz")).toBeNull();
  });

  it("porId lança em erro que não é NOT_FOUND", async () => {
    const fetchFake = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many requests." } }), {
          status: 429,
        }),
      ),
    );

    const cliente = criarClienteExerciseDB({ fetch: fetchFake as unknown as typeof fetch });
    await expect(cliente.porId("xyz")).rejects.toThrow();
  });
});
