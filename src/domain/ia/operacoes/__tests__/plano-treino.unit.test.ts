import { describe, expect, it, vi } from "vitest";

const decidir = vi.fn();
vi.mock("../../decidir", () => ({ decidir: (...args: unknown[]) => decidir(...args) }));

const { gerarPlanoTreinoComIA, planoTreinoSchema } = await import("../plano-treino");

const nucleo = { perfilVersao: 7, modoConservador: false };

const exercicioValido = {
  exercicioId: "supino-barra",
  nome: "Supino reto com barra",
  padrao: "empurrar-horizontal",
  series: 3,
  repeticoes: "6-10",
  rir: 2,
  descansoSeg: 120,
  explicacao: {
    porque: "Você tem barra e banco na academia e 60 minutos por sessão, o que comporta um composto pesado.",
    dadosUsados: [{ campo: "equipamentos", valor: "barra olímpica, banco reto" }],
  },
};

const treinoValido = {
  regraVersao: "agent-plano-v1",
  modoConservador: false,
  prioridadesCorporais: ["ombros"],
  perfilVersao: 7,
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [{
      id: "dia-1",
      nome: "Superior",
      diaSemana: "segunda",
      exercicios: [exercicioValido],
      explicacao: {
        porque: "Você marcou segunda como dia disponível e a divisão superior abre a semana com mais energia.",
        dadosUsados: [{ campo: "diasDisponiveis", valor: "segunda, quinta" }],
      },
    }],
    explicacao: {
      porque: "Seis semanas correspondem à sua experiência intermediária, com margem para progressão.",
      dadosUsados: [{ campo: "experienciaTreino", valor: "intermediario" }],
    },
  },
  dadosUsados: ["triagem-completa", "linha-base-corporal"],
};

describe("gerarPlanoTreinoComIA", () => {
  it("envia o recorte autorizado e as fotos ao agent", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: treinoValido, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoTreinoComIA({
      userId: "u1",
      nucleo,
      triagemCompleta: { horasSono: 8, nivelAtividade: "moderado", objetivoComposicao: "ganhar-massa" },
      fotosCorporais: [{ id: "f1", pose: "frente", observadoEm: "2026-08-13", dados: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg" }],
      origem: { tela: "resumo-triagem", rota: "/triagem/resumo", gatilho: "clique-gerar-meu-plano" },
    });

    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      operacao: "plano-treino",
      imagens: [{ dados: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg" }],
    }));
  });

  it("não consulta ferramentas: o catálogo já traz o que o agent precisa", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: treinoValido, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoTreinoComIA({
      userId: "u1",
      nucleo,
      triagemCompleta: {},
    });

    expect(decidir).toHaveBeenCalledWith(
      expect.not.objectContaining({ ferramentas: expect.anything() }),
    );
  });

  it("envia o catálogo em linhas, sem instruções de execução", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: treinoValido, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoTreinoComIA({ userId: "u1", nucleo, triagemCompleta: {} });

    const { instrucao } = decidir.mock.calls[0][0] as { instrucao: string };
    expect(instrucao).toContain("supino-barra | empurrar-horizontal |");
    // O texto de execução vive no catálogo estático e a tela o usa direto.
    expect(instrucao).not.toContain("retraça as escápulas");
  });

  it("aceita bloco com explicação ancorada em toda decisão", () => {
    const analise = planoTreinoSchema.safeParse(treinoValido);
    expect(analise.error?.issues ?? []).toEqual([]);
    expect(analise.success).toBe(true);
  });

  it("rejeita exercício sem explicação", () => {
    const semExplicacao = {
      ...treinoValido,
      bloco: {
        ...treinoValido.bloco,
        dias: [{ ...treinoValido.bloco.dias[0], exercicios: [{ ...exercicioValido, explicacao: undefined }] }],
      },
    };
    expect(planoTreinoSchema.safeParse(semExplicacao).success).toBe(false);
  });

  it("rejeita escolha de exercício ancorada apenas em peso corporal", () => {
    const ancoraErrada = {
      ...treinoValido,
      bloco: {
        ...treinoValido.bloco,
        dias: [{
          ...treinoValido.bloco.dias[0],
          exercicios: [{
            ...exercicioValido,
            explicacao: {
              porque: "Seus 80 kg de peso corporal indicam boa base de força para este movimento.",
              dadosUsados: [{ campo: "pesoKg", valor: "80" }],
            },
          }],
        }],
      },
    };
    expect(planoTreinoSchema.safeParse(ancoraErrada).success).toBe(false);
  });

  it("rejeita explicação que cita dado nunca enviado ao agent", () => {
    const campoInventado = {
      ...treinoValido,
      bloco: {
        ...treinoValido.bloco,
        dias: [{
          ...treinoValido.bloco.dias[0],
          exercicios: [{
            ...exercicioValido,
            explicacao: {
              porque: "Seu exame de sangue recente indica disposição para carga alta neste padrão.",
              dadosUsados: [{ campo: "exameDeSangue", valor: "normal" }],
            },
          }],
        }],
      },
    };
    expect(planoTreinoSchema.safeParse(campoInventado).success).toBe(false);
  });

  it("rejeita exercício inventado pelo modelo", () => {
    const invalido = {
      ...treinoValido,
      bloco: {
        ...treinoValido.bloco,
        dias: [{
          ...treinoValido.bloco.dias[0],
          exercicios: [{ ...exercicioValido, exercicioId: "exercicio-inventado" }],
        }],
      },
    };
    expect(planoTreinoSchema.safeParse(invalido).success).toBe(false);
  });
});
