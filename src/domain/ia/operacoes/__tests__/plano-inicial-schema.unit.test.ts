import { describe, expect, it } from "vitest";
import { planoInicialSchema } from "../plano-inicial";

describe("schema do plano inicial", () => {
  it("exige instruções de execução em cada exercício", () => {
    const resultado = planoInicialSchema.safeParse({
      regraVersao: "agent-plano-v1", modoConservador: false, prioridadesCorporais: [], perfilVersao: 1,
      bloco: { duracaoSemanas: 4, divisao: "teste", dias: [{ id: "d1", nome: "Dia", diaSemana: "segunda", exercicios: [{ exercicioId: "prancha", nome: "Prancha", padrao: "core", series: 3, repeticoes: "30–45", rir: 0, descansoSeg: 45, justificativa: "teste", explicacao: { porque: "teste", dadosUsados: [{ campo: "experienciaTreino", valor: "iniciante" }] } }] }] },
      nutricao: { calorias: 2000, proteinaG: 150, carboidratosG: 200, gordurasG: 60, fibrasG: 25, estrategia: "teste", refeicoes: [] }, dadosUsados: [],
    });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error.issues.some((issue) => issue.path.join(".").includes("comoExecutar"))).toBe(true);
  });
});
