import { describe, expect, it } from "vitest";
import { executarComTimeout } from "../timeout-geracao";

describe("executarComTimeout", () => {
  it("rejeita com timeout quando a operação não termina no prazo", async () => {
    await expect(executarComTimeout(() => new Promise(() => {}), 5)).rejects.toThrow("Timeout da geração de IA após 5 ms");
  });

  it("propaga cancelamento externo ao sinal da chamada ativa", async () => {
    const externo = new AbortController();
    let sinalRecebido: AbortSignal | undefined;
    const promessa = executarComTimeout(
      (signal) => {
        sinalRecebido = signal;
        return new Promise(() => {});
      },
      1_000,
      externo.signal,
    );

    externo.abort();

    await expect(promessa).rejects.toMatchObject({ name: "AbortError" });
    expect(sinalRecebido?.aborted).toBe(true);
  });
});
