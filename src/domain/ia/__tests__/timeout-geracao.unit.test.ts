import { describe, expect, it } from "vitest";
import { executarComTimeout } from "../timeout-geracao";

describe("executarComTimeout", () => {
  it("rejeita com timeout quando a operação não termina no prazo", async () => {
    await expect(executarComTimeout(() => new Promise(() => {}), 5)).rejects.toThrow("Timeout da geração de IA após 5 ms");
  });
});
