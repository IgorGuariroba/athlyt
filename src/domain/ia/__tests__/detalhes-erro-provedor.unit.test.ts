import { describe, expect, it } from "vitest";
import { detalhesErroProvedor } from "../detalhes-erro-provedor";

describe("detalhesErroProvedor", () => {
  it("preserva só o status e nunca o corpo enriquecido", () => {
    const detalhe = detalhesErroProvedor({
      message: "Provider returned SEGREDO",
      statusCode: 429,
      responseBody: '{"foto":"SEGREDO"}',
    });
    expect(detalhe).toBe("Falha do provedor (HTTP 429)");
    expect(detalhe).not.toContain("SEGREDO");
  });
});
