import { describe, expect, it } from "vitest";
import { criarProtocoloExecucao } from "../protocolo-execucao";

describe("criarProtocoloExecucao", () => {
  it("define prancha como sustentação por tempo, sem carga ou repetições", () => {
    expect(criarProtocoloExecucao({ exercicioId: "prancha", repeticoes: "30–45", cargaKg: false })).toEqual({
      modalidade: "tempo",
      unidade: "segundos",
      alvo: "30–45",
      exigeCarga: false,
      exigeRir: false,
    });
  });

  it.each([
    ["distancia", "metros"], ["duracao", "minutos"], ["calorias", "kcal"],
    ["ritmo", "pace"], ["unilateral", "lados"], ["circuito", "rodadas"],
  ] as const)("traduz %s para a unidade %s", (modalidade, unidade) => {
    expect(criarProtocoloExecucao({ exercicioId: "exercicio-teste", modalidade, repeticoes: "10" }).unidade).toBe(unidade);
  });
});
