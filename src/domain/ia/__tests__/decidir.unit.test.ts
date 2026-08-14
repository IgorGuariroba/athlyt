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

vi.mock("../provedor", () => ({
  modeloDe: () => "openai/gpt-5-mini",
  NOME_PROVEDOR: "OpenRouter",
  openrouter: () => ({ chatModel: (id: string) => ({ id }) }),
  OPCOES_PROVEDOR: {},
}));

const { decidir } = await import("../decidir");
const { montarNucleo } = await import("../contexto/nucleo");

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
