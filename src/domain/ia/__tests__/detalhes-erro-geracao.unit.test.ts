import { describe, expect, it } from "vitest";
import { detalhesErroGeracao } from "../detalhes-erro-geracao";

describe("detalhesErroGeracao", () => {
  it("inclui causa de validação e texto bruto da resposta", () => {
    expect(detalhesErroGeracao({
      message: "No object generated: response did not match schema.",
      cause: { message: "comoExecutar: Invalid input" },
      text: '{"bloco":{"dias":[]}}',
    })).toBe("No object generated: response did not match schema. | causa: comoExecutar: Invalid input | resposta: {\"bloco\":{\"dias\":[]}}");
  });
});
