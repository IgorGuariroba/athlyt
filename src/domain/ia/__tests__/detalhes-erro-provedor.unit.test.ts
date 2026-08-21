import { describe, expect, it } from "vitest";
import { detalhesErroProvedor } from "../detalhes-erro-provedor";

describe("detalhesErroProvedor", () => {
  it("preserva status HTTP e corpo da resposta sem expor segredos", () => {
    expect(detalhesErroProvedor({
      message: "Provider returned error",
      statusCode: 429,
      responseBody: '{"error":{"message":"rate limit"}}',
    })).toBe("Provider returned error (HTTP 429): {\"error\":{\"message\":\"rate limit\"}}");
  });
});
