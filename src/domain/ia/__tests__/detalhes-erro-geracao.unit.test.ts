import { describe, expect, it } from "vitest";
import { detalhesErroGeracao } from "../detalhes-erro-geracao";

describe("detalhesErroGeracao", () => {
  it("classifica saída inválida sem copiar causa nem resposta bruta", () => {
    const detalhe = detalhesErroGeracao({
      message: "No object generated: SEGREDO",
      cause: { message: "SEGREDO" },
      text: '{"foto":"SEGREDO"}',
    });
    expect(detalhe).toBe("Saída inválida do modelo.");
    expect(detalhe).not.toContain("SEGREDO");
  });
});
