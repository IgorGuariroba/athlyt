import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const decisoesGravadas: unknown[] = [];

vi.mock("@/domain/ia/trilha", async () => {
  const real = await vi.importActual<typeof import("../trilha")>("../trilha");
  return {
    ...real,
    registrarDecisao: vi.fn(async (registro: unknown) => {
      decisoesGravadas.push(registro);
    }),
  };
});

const gerar = vi.fn();
vi.mock("ai", async () => {
  const real = await vi.importActual<typeof import("ai")>("ai");
  return { ...real, generateText: (...args: unknown[]) => gerar(...args) };
});

const registrarErro = vi.fn();
vi.mock("@/observabilidade/logger", () => ({
  logger: { error: registrarErro },
}));

vi.mock("../provedor", () => ({
  modeloDe: () => "openai/gpt-5-mini",
  NOME_PROVEDOR: "OpenRouter",
  openrouter: () => ({ chatModel: (id: string) => ({ id }) }),
  OPCOES_PROVEDOR: {},
}));

const { decidir } = await import("../decidir");
const { montarNucleo } = await import("../contexto/nucleo");
const { NoObjectGeneratedError, TypeValidationError } = await import("ai");

const schema = z.object({ carga: z.number() });

const nucleo = montarNucleo({
  perfilVersao: 4,
  respostas: { pesoKg: 80 },
  respondidoEm: new Date("2026-07-01T00:00:00Z"),
  agora: new Date("2026-07-30T00:00:00Z"),
});

function chamar() {
  return decidir({
    userId: "u1",
    operacao: "copiloto-sessao",
    nucleo,
    consentimentos: ["prontidao-hoje"],
    dados: {
      exercicio: { nome: "Supino" },
      "prontidao-hoje": { energia: 3 },
    },
    instrucao: "instrução",
    schema,
  });
}

beforeEach(() => {
  decisoesGravadas.length = 0;
  gerar.mockReset();
  registrarErro.mockReset();
});

describe("decidir", () => {
  it("devolve o valor e grava o modelo resolvido pelo provedor", async () => {
    gerar.mockResolvedValue({
      output: { carga: 60 },
      response: { modelId: "openai/gpt-5-mini-2026-01" },
      steps: [],
    });

    const resultado = await chamar();

    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.valor).toEqual({ carga: 60 });
    // O resolvido, não o solicitado (ADR 0005).
    expect(resultado.modeloResolvido).toBe("openai/gpt-5-mini-2026-01");
    expect(decisoesGravadas).toHaveLength(1);
    expect(decisoesGravadas[0]).toMatchObject({
      auditavel: true,
      camposEnviados: ["exercicio", "prontidao-hoje"],
      camposOmitidos: [],
      perfilVersao: 4,
      contextoEnviado: expect.objectContaining({
        operacao: "copiloto-sessao",
        recorte: expect.objectContaining({ exercicio: { nome: "Supino" } }),
      }),
      instrucaoSistema: "instrução",
    });
  });

  it("registra argumentos e retorno das ferramentas chamadas pelo agent", async () => {
    gerar.mockImplementation(async (entrada: { onStepFinish: (passo: { toolCalls: unknown[]; toolResults: unknown[] }) => void }) => {
      entrada.onStepFinish({
        toolCalls: [{ toolName: "historico_exercicio", input: { exercicioId: "supino" } }],
        toolResults: [{ toolName: "historico_exercicio", input: { exercicioId: "supino" }, output: { melhorCargaKg: 80 } }],
      });
      return { output: { carga: 60 }, response: { modelId: "m" }, steps: [] };
    });

    await chamar();

    expect(decisoesGravadas[0]).toMatchObject({
      ferramentasConsultadas: [{
        nome: "historico_exercicio",
        argumentos: { exercicioId: "supino" },
        resultado: { melhorCargaKg: 80 },
      }],
    });
  });

  it("trata resposta sem modelo identificado como não auditável e degrada", async () => {
    gerar.mockResolvedValue({
      output: { carga: 60 },
      response: { modelId: "" },
      steps: [],
    });

    const resultado = await chamar();

    expect(resultado.status).toBe("indisponivel");
    expect(decisoesGravadas[0]).toMatchObject({ auditavel: false });
    expect(registrarErro).toHaveBeenCalledWith(
      expect.objectContaining({
        operacao: "copiloto-sessao",
        modeloSolicitado: "openai/gpt-5-mini",
        err: expect.any(Error),
      }),
      "decisão de IA indisponível",
    );
  });

  it("repete uma vez quando o modelo devolve JSON inválido", async () => {
    gerar
      .mockRejectedValueOnce(new Error("Invalid JSON response"))
      .mockResolvedValueOnce({
        output: { carga: 60 },
        response: { modelId: "openai/gpt-5-mini-2026-01" },
        steps: [],
      });

    const resultado = await chamar();

    expect(resultado.status).toBe("ok");
    expect(gerar).toHaveBeenCalledTimes(2);
    expect(decisoesGravadas).toHaveLength(1);
  });

  it("corrige uma vez a saída JSON que viola o schema", async () => {
    const textoInvalido = JSON.stringify({ carga: "60" });
    const erroValidacao = new NoObjectGeneratedError({
      message: "No object generated: response did not match schema.",
      cause: new TypeValidationError({
        value: { carga: "60" },
        cause: new Error("Explicação precisa citar equipamentos"),
      }),
      text: textoInvalido,
      response: {
        id: "resposta-invalida",
        timestamp: new Date("2026-07-30T00:00:00Z"),
        modelId: "openai/gpt-5-mini-2026-01",
      },
      usage: {
        inputTokens: 10,
        inputTokenDetails: {
          noCacheTokens: 10,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
        outputTokens: 5,
        outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
        totalTokens: 15,
      },
      finishReason: "stop",
    });
    gerar
      .mockRejectedValueOnce(erroValidacao)
      .mockResolvedValueOnce({
        output: { carga: 60 },
        response: { modelId: "openai/gpt-5-mini-2026-01" },
        steps: [],
      });

    const resultado = await chamar();

    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.valor).toEqual({ carga: 60 });
    expect(gerar).toHaveBeenCalledTimes(2);
    const promptCorrecao = gerar.mock.calls[1]?.[0]?.prompt as string;
    expect(promptCorrecao).toContain("Explicação precisa citar equipamentos");
    expect(promptCorrecao.split(textoInvalido)).toHaveLength(2);
    expect(decisoesGravadas).toHaveLength(1);
  });

  it("grava a trilha mesmo quando a chamada falha", async () => {
    gerar.mockRejectedValue(new Error("provedor fora do ar"));

    const resultado = await chamar();

    expect(resultado.status).toBe("indisponivel");
    if (resultado.status !== "indisponivel") return;
    expect(resultado.motivo).toContain("provedor fora do ar");
    expect(decisoesGravadas[0]).toMatchObject({
      auditavel: false,
      erro: "provedor fora do ar",
    });
    expect(registrarErro).toHaveBeenCalledWith(
      expect.objectContaining({
        operacao: "copiloto-sessao",
        modeloSolicitado: "openai/gpt-5-mini",
        err: expect.any(Error),
      }),
      "decisão de IA indisponível",
    );
    expect(registrarErro.mock.calls[0]?.[0]).not.toHaveProperty("userId");
  });

  it("registra na trilha os campos omitidos por falta de consentimento", async () => {
    gerar.mockResolvedValue({
      output: { carga: 60 },
      response: { modelId: "m" },
      steps: [],
    });

    await decidir({
      userId: "u1",
      operacao: "copiloto-sessao",
      nucleo,
      consentimentos: [],
      dados: {
        exercicio: { nome: "Supino" },
        "prontidao-hoje": { energia: 3 },
      },
      instrucao: "instrução",
      schema,
    });

    expect(decisoesGravadas[0]).toMatchObject({
      camposEnviados: ["exercicio"],
      camposOmitidos: ["prontidao-hoje"],
      degradado: true,
    });
  });
});
