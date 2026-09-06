import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const decisoesGravadas: unknown[] = [];
const estadoConsentimento = vi.fn();

vi.mock("../consentimento", () => ({ estadoConsentimento }));

vi.mock("@/domain/ia/trilha", async () => {
  const real = await vi.importActual<typeof import("../trilha")>("../trilha");
  return {
    ...real,
    registrarDecisao: vi.fn((registro: unknown) => {
      decisoesGravadas.push(registro);
    }),
  };
});

/**
 * Recorte do objeto que `decidir` passa ao `generateText`, com só o que
 * os testes abaixo afirmam. O `vi.fn` tipado é o que dá checagem de
 * compilação às leituras de `mock.calls` — sem ele, toda leitura é `any`.
 */
interface ChamadaGerar {
  prompt?: string;
  maxOutputTokens?: number;
  providerOptions?: { openrouter?: { provider?: { only?: string[] } } };
  onStepFinish?: (passo: {
    toolCalls: { toolName: string; input: unknown }[];
    toolResults: { toolName: string; input: unknown; output: unknown }[];
  }) => void;
}

const gerar = vi.fn<(entrada: ChamadaGerar) => Promise<unknown>>(() =>
  Promise.resolve(undefined),
);
vi.mock("ai", async () => {
  const real = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...real,
    generateText: async (entrada: ChamadaGerar) => {
      const res = (await gerar(entrada)) as
        | { response?: { modelId?: string }; finalStep?: { response?: { modelId?: string } } }
        | undefined;
      if (res && !res.finalStep && res.response) {
        res.finalStep = { response: res.response };
      }
      return res;
    },
  };
});

const registrarErro = vi.fn();
vi.mock("@/observabilidade/logger", () => ({
  logger: { error: registrarErro, warn: vi.fn() },
}));

vi.mock("../provedor", () => ({
  modeloDe: () => "openai/gpt-5-mini",
  NOME_PROVEDOR: "OpenRouter",
  openrouter: () => ({ chatModel: (id: string) => ({ id }) }),
  OPCOES_PROVEDOR: {},
  opcoesDaRota: (rota: { endpoint: string }) => ({
    openrouter: { provider: { only: [rota.endpoint], allow_fallbacks: false } },
  }),
}));

const { decidir } = await import("../decidir");
const { montarNucleo } = await import("../contexto/nucleo");
const { NoObjectGeneratedError, NoOutputGeneratedError, TypeValidationError } =
  await import("ai");

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
  estadoConsentimento.mockResolvedValue({ vigentes: ["prontidao-hoje"] });
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
    // O resolvido, não o solicitado.
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
    gerar.mockImplementation((entrada) => {
      entrada.onStepFinish?.({
        toolCalls: [{ toolName: "historico_exercicio", input: { exercicioId: "supino" } }],
        toolResults: [{ toolName: "historico_exercicio", input: { exercicioId: "supino" }, output: { melhorCargaKg: 80 } }],
      });
      return Promise.resolve({ output: { carga: 60 }, response: { modelId: "m" }, steps: [] });
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

  it("repete uma vez quando o provedor devolve resposta vazia", async () => {
    // Observado em produção com `refeicao-texto`: o provedor responde
    // sem conteúdo algum e a tela termina indisponível, embora a mesma
    // descrição funcione segundos depois. Sem `output` não há o que
    // corrigir no prompt — a mesma pergunta é refeita.
    gerar
      .mockRejectedValueOnce(
        new NoOutputGeneratedError({ message: "No output generated." }),
      )
      .mockResolvedValueOnce({
        output: { carga: 60 },
        response: { modelId: "openai/gpt-5-mini-2026-01" },
        steps: [],
      });

    const resultado = await chamar();

    expect(resultado.status).toBe("ok");
    expect(gerar).toHaveBeenCalledTimes(2);
    // Uma decisão na Trilha, e não duas: a repetição é da mesma
    // pergunta, não uma segunda decisão do agent.
    expect(decisoesGravadas).toHaveLength(1);
  });

  it("desiste quando a resposta vazia se repete, em vez de insistir", async () => {
    gerar.mockRejectedValue(
      new NoOutputGeneratedError({ message: "No output generated." }),
    );

    const resultado = await chamar();

    expect(resultado.status).toBe("indisponivel");
    expect(gerar).toHaveBeenCalledTimes(2);
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
    const promptCorrecao = gerar.mock.calls[1]?.[0]?.prompt ?? "";
    expect(promptCorrecao).toContain("Explicação precisa citar equipamentos");
    expect(promptCorrecao.split(textoInvalido)).toHaveLength(2);
    expect(decisoesGravadas).toHaveLength(1);
  });

  it("grava a trilha mesmo quando a chamada falha", async () => {
    gerar.mockRejectedValue(Object.assign(new Error("provedor fora do ar SEGREDO_ERRO"), {
      responseBody: '{"foto":"SEGREDO_ERRO"}',
      cause: new Error("SEGREDO_ERRO"),
    }));

    const resultado = await chamar();

    expect(resultado.status).toBe("indisponivel");
    if (resultado.status !== "indisponivel") return;
    expect(resultado.motivo).toBe("Falha do provedor.");
    expect(decisoesGravadas[0]).toMatchObject({
      auditavel: false,
      erro: "Falha do provedor.",
    });
    expect(registrarErro).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: "erro",
        operacao: "copiloto-sessao",
        rotaSolicitada: "openai/gpt-5-mini",
        err: expect.any(Error),
      }),
      "decisão de IA indisponível",
    );
    expect(registrarErro.mock.calls[0]?.[0]).not.toHaveProperty("userId");
    expect(JSON.stringify(decisoesGravadas[0])).not.toContain("SEGREDO_ERRO");
  });

  it("executa cadeia aprovada com o mesmo Recorte e grava uma única decisão", async () => {
    const erro429 = Object.assign(new Error("rate limit"), { statusCode: 429 });
    gerar
      .mockRejectedValueOnce(erro429)
      .mockRejectedValueOnce(erro429)
      .mockResolvedValueOnce({
        output: { carga: 60 },
        response: { modelId: "modelo-2" },
        steps: [],
      });

    const resultado = await decidir({
      userId: "u1",
      operacao: "copiloto-sessao",
      nucleo,
      dados: { exercicio: { nome: "Supino" }, "prontidao-hoje": { energia: 3 } },
      instrucao: "instrução",
      schema,
      rotas: [
        { modelo: "modelo-1", endpoint: "endpoint-1" },
        { modelo: "modelo-2", endpoint: "endpoint-2" },
      ],
    });

    expect(resultado.status).toBe("ok");
    expect(gerar).toHaveBeenCalledTimes(3);
    expect(gerar.mock.calls.map(([chamada]) => chamada.maxOutputTokens)).toEqual([4096, 4096, 4096]);
    expect(gerar.mock.calls.map(([chamada]) => chamada.providerOptions?.openrouter?.provider?.only)).toEqual([
      ["endpoint-1"], ["endpoint-1"], ["endpoint-2"],
    ]);
    expect(gerar.mock.calls.map(([chamada]) => chamada.prompt)).toEqual([
      expect.any(String), expect.any(String), expect.any(String),
    ]);
    expect(decisoesGravadas).toHaveLength(1);
    expect(decisoesGravadas[0]).toMatchObject({
      desfecho: "ok",
      modeloResolvido: "modelo-2",
      tentativasModelo: [
        { ordem: 1, chamadas: 2, desfecho: "limite-taxa" },
        { ordem: 2, chamadas: 1, desfecho: "ok" },
      ],
    });
  });

  it("registra na trilha os campos omitidos por falta de consentimento", async () => {
    estadoConsentimento.mockResolvedValueOnce({ vigentes: [] });
    gerar.mockResolvedValue({
      output: { carga: 60 },
      response: { modelId: "m" },
      steps: [],
    });

    await decidir({
      userId: "u1",
      operacao: "copiloto-sessao",
      nucleo,
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
