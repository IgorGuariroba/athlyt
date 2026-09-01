import { describe, expect, it } from "vitest";
import { EXERCICIOS } from "../exercicios";
import { MIDIA_EXECUCAO, midiaDoExercicio } from "../midia-execucao";

/**
 * Mapa curado Athlyt → ExerciseDB para a Mídia de Execução.
 *
 * Invariante no mesmo espírito de `equipamentosDesconhecidos()`: toda
 * chave do mapa precisa apontar para um exercício real do catálogo —
 * um id órfão nunca seria alcançado e ficaria morto em silêncio.
 *
 * O mapa é intencionalmente parcial (curadoria manual, não fuzzy
 * match); exercício sem entrada cai no fallback em texto.
 */
describe("MIDIA_EXECUCAO", () => {
  const idsDoCatalogo = new Set(EXERCICIOS.map((e) => e.id));

  it("toda chave do mapa corresponde a um exercício existente no catálogo", () => {
    for (const exercicioId of Object.keys(MIDIA_EXECUCAO)) {
      expect(idsDoCatalogo.has(exercicioId)).toBe(true);
    }
  });

  it("cada entrada tem chaveObjeto derivada do id do exercício, sem colisão", () => {
    const chaves = new Set<string>();
    for (const [exercicioId, midia] of Object.entries(MIDIA_EXECUCAO)) {
      expect(midia.chaveObjeto).toBe(`midia-execucao/${exercicioId}.gif`);
      expect(chaves.has(midia.chaveObjeto)).toBe(false);
      chaves.add(midia.chaveObjeto);
    }
  });

  it("midiaDoExercicio devolve a entrada mapeada", () => {
    expect(midiaDoExercicio("supino-barra")).toEqual(MIDIA_EXECUCAO["supino-barra"]);
  });

  it("midiaDoExercicio devolve undefined para exercício sem mídia mapeada", () => {
    expect(midiaDoExercicio("id-inexistente")).toBeUndefined();
  });

  it("cobre uma parte relevante do catálogo (curadoria em andamento, não exige 100%)", () => {
    expect(Object.keys(MIDIA_EXECUCAO).length).toBeGreaterThan(0);
    expect(Object.keys(MIDIA_EXECUCAO).length).toBeLessThanOrEqual(EXERCICIOS.length);
  });
});
