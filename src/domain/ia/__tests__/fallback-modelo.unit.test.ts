import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executarFallbackDeModelo,
  type RotaModeloAprovada,
} from "../fallback-modelo";

const ROTAS: readonly RotaModeloAprovada[] = [
  { modelo: "modelo-1", endpoint: "endpoint-1" },
  { modelo: "modelo-2", endpoint: "endpoint-2" },
  { modelo: "modelo-3", endpoint: "endpoint-3" },
];

afterEach(() => vi.useRealTimers());

describe("executarFallbackDeModelo", () => {
  it("conclui no primário sem iniciar alternativas", async () => {
    const executar = vi.fn(async () => ({
      tipo: "sucesso" as const,
      valor: { refeicao: "almoço" },
      modeloResolvido: "modelo-1@2026",
    }));

    const resultado = await executarFallbackDeModelo({ rotas: ROTAS, executar });

    expect(resultado).toMatchObject({
      status: "ok",
      valor: { refeicao: "almoço" },
      modeloResolvido: "modelo-1@2026",
      rotaResolvida: ROTAS[0],
      tentativas: [{ ordem: 1, rota: ROTAS[0], chamadas: 1, desfecho: "ok" }],
    });
    expect(executar).toHaveBeenCalledOnce();
    expect(executar).toHaveBeenCalledWith(ROTAS[0], expect.objectContaining({ chamada: 1 }));
  });

  it("repete uma falha transitória uma vez e então avança para a próxima rota", async () => {
    const progresso = vi.fn();
    const executar = vi
      .fn()
      .mockResolvedValueOnce({ tipo: "limite-taxa", motivo: "429", retryable: true })
      .mockResolvedValueOnce({ tipo: "limite-taxa", motivo: "429", retryable: true })
      .mockResolvedValueOnce({
        tipo: "sucesso",
        valor: { refeicao: "jantar" },
        modeloResolvido: "modelo-2",
      });

    const resultado = await executarFallbackDeModelo({
      rotas: ROTAS,
      executar,
      aoProgresso: progresso,
    });

    expect(resultado.status).toBe("ok");
    expect(executar.mock.calls.map(([rota, contexto]) => [rota, contexto.chamada])).toEqual([
      [ROTAS[0], 1],
      [ROTAS[0], 2],
      [ROTAS[1], 1],
    ]);
    expect(resultado.tentativas).toEqual([
      { ordem: 1, rota: ROTAS[0], chamadas: 2, desfecho: "limite-taxa" },
      { ordem: 2, rota: ROTAS[1], chamadas: 1, desfecho: "ok" },
    ]);
    expect(progresso).toHaveBeenCalledWith({ tipo: "alternativa", tentativa: 2, total: 3 });
  });

  it("corrige saída inválida na mesma rota e nunca avança para outro modelo", async () => {
    const executar = vi.fn()
      .mockResolvedValueOnce({ tipo: "saida-invalida", motivo: "schema", retryable: true })
      .mockResolvedValueOnce({ tipo: "saida-invalida", motivo: "schema" });

    const resultado = await executarFallbackDeModelo({ rotas: ROTAS, executar });

    expect(resultado.status).toBe("indisponivel");
    expect(executar.mock.calls.map(([rota]) => rota)).toEqual([ROTAS[0], ROTAS[0]]);
    expect(resultado.tentativas).toEqual([
      { ordem: 1, rota: ROTAS[0], chamadas: 2, desfecho: "saida-invalida" },
    ]);
  });

  it("cancela a rota ativa e não inicia fallback", async () => {
    const controlador = new AbortController();
    const executar = vi.fn((_rota, { signal }) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("cancelada", "AbortError")), { once: true });
    }));
    const promessa = executarFallbackDeModelo({ rotas: ROTAS, executar, signal: controlador.signal });

    controlador.abort();

    await expect(promessa).resolves.toMatchObject({
      status: "cancelada",
      tentativas: [{ ordem: 1, chamadas: 1, desfecho: "cancelada" }],
    });
    expect(executar).toHaveBeenCalledOnce();
  });

  it("o limite global aborta tudo e impede nova tentativa", async () => {
    vi.useFakeTimers();
    const executar = vi.fn((_rota, { signal }) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
    }));
    const promessa = executarFallbackDeModelo({
      rotas: ROTAS,
      executar,
      orcamentoRotaMs: 120_000,
      orcamentoTotalMs: 250_000,
    });

    await vi.advanceTimersByTimeAsync(250_000);

    await expect(promessa).resolves.toMatchObject({
      status: "indisponivel",
      motivo: "Orçamento global da decisão esgotado.",
    });
    expect(executar).toHaveBeenCalledTimes(3);
  });

  it("o limite por rota aborta a chamada e avança quando resta orçamento global", async () => {
    vi.useFakeTimers();
    const executar = vi.fn()
      .mockImplementationOnce((_rota, { signal }) => new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
      }))
      .mockResolvedValueOnce({ tipo: "sucesso", valor: "ok", modeloResolvido: "modelo-2" });
    const promessa = executarFallbackDeModelo({
      rotas: ROTAS,
      executar,
      orcamentoRotaMs: 120_000,
      orcamentoTotalMs: 360_000,
    });

    await vi.advanceTimersByTimeAsync(120_000);

    await expect(promessa).resolves.toMatchObject({
      status: "ok",
      tentativas: [
        { ordem: 1, desfecho: "timeout" },
        { ordem: 2, desfecho: "ok" },
      ],
    });
  });
});
