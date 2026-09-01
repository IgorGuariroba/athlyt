import { describe, expect, it } from "vitest";
import { rotuloDeConfianca } from "../proveniencia";

/**
 * O rótulo exibido responde "de onde veio este número?", e não apenas
 * "quão certo ele é". Sem essa distinção, um frango que o modelo
 * reconheceu numa foto com confiança alta aparecia na tela como "valor
 * de tabela analítica" — uma estimativa vestida de medição, que é
 * exatamente o que a regra de transparência da estimativa proíbe.
 */
describe("rótulo de confiança por origem do dado", () => {
  it("nunca chama estimativa de IA de valor de tabela, mesmo com confiança alta", () => {
    expect(rotuloDeConfianca("alta", "estimativa-ia")).toMatch(/^Estimativa/);
    expect(rotuloDeConfianca("alta", "estimativa-ia")).not.toMatch(/tabela/i);
  });

  it("mantém a leitura de fonte para o que veio da base nutricional", () => {
    expect(rotuloDeConfianca("alta", "base")).toBe("Valor de tabela analítica");
    expect(rotuloDeConfianca("media", "base")).toBe("Valor aproximado");
  });

  it("atribui ao atleta o que o atleta digitou", () => {
    expect(rotuloDeConfianca("baixa", "usuario")).toBe("Estimativa sua — informada por você");
  });
});
