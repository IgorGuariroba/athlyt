import { describe, expect, it, vi } from "vitest";

const gerarTreino = vi.fn();
const gerarNutricao = vi.fn();
vi.mock("../plano-treino", () => ({ gerarPlanoTreinoComIA: (...a: unknown[]) => gerarTreino(...a) }));
vi.mock("../plano-nutricao", () => ({ gerarPlanoNutricaoComIA: (...a: unknown[]) => gerarNutricao(...a) }));

const { gerarPlanoInicialComIA } = await import("../plano-inicial");

const entrada = {
  userId: "u1",
  nucleo: { perfilVersao: 7, modoConservador: false },
  consentimentos: ["triagem-completa"],
  triagemCompleta: {},
};

const treino = {
  regraVersao: "agent-plano-v1",
  modoConservador: false,
  prioridadesCorporais: [],
  perfilVersao: 7,
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [{
      id: "dia-1",
      nome: "Superior",
      diaSemana: "segunda",
      exercicios: [{
        exercicioId: "supino-barra",
        nome: "Supino reto com barra",
        padrao: "empurrar-horizontal",
        series: 3,
        repeticoes: "6-10",
        rir: 2,
        descansoSeg: 120,
        explicacao: { porque: "x".repeat(45), dadosUsados: [{ campo: "equipamentos", valor: "barra" }] },
      }],
      explicacao: { porque: "x".repeat(45), dadosUsados: [{ campo: "diasDisponiveis", valor: "segunda" }] },
    }],
    explicacao: { porque: "x".repeat(45), dadosUsados: [{ campo: "experienciaTreino", valor: "intermediario" }] },
  },
  dadosUsados: ["triagem-completa"],
};

const nutricao = {
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 280, gordurasG: 70, fibrasG: 30, estrategia: "Superávit leve", refeicoes: [], explicacoes: {} },
  dadosUsados: ["linha-base-corporal"],
};

const okTreino = { status: "ok", valor: treino, contexto: { operacao: "plano-treino" }, modeloResolvido: "openai/gpt-5.6-luna", degradado: false };
const okNutricao = { status: "ok", valor: nutricao, contexto: { operacao: "plano-nutricao" }, modeloResolvido: "openai/gpt-5.6-luna", degradado: false };

describe("gerarPlanoInicialComIA", () => {
  it("gera treino e nutrição em paralelo e junta num único plano", async () => {
    gerarTreino.mockResolvedValue(okTreino);
    gerarNutricao.mockResolvedValue(okNutricao);

    const resultado = await gerarPlanoInicialComIA(entrada);

    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.valor.bloco.divisao).toBe("Superior / Inferior");
    expect(resultado.valor.nutricao.calorias).toBe(2400);
    expect(resultado.valor.dadosUsados).toEqual(["triagem-completa", "linha-base-corporal"]);
  });

  it("materializa itens nutricionais com proveniência antes de publicar o plano", async () => {
    const item = {
      nome: "Aveia", porcaoDescrita: "60 g", quantidade: 60, unidade: "g",
      calorias: 236, proteinaG: 8, carboidratosG: 40, gordurasG: 5, fibrasG: 5,
      confianca: "alta",
    };
    gerarTreino.mockResolvedValue(okTreino);
    gerarNutricao.mockResolvedValue({
      ...okNutricao,
      valor: {
        ...nutricao,
        nutricao: {
          ...nutricao.nutricao,
          refeicoes: [{
            nome: "Café da manhã", percentual: 25, calorias: 236, proteinaG: 8,
            itens: [item], explicacao: { porque: "x".repeat(45), dadosUsados: [] },
          }],
        },
      },
    });

    const resultado = await gerarPlanoInicialComIA(entrada);

    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.valor.nutricao.refeicoes[0].itens[0]).toMatchObject({
      nome: "Aveia em flocos",
      quantidade: 60,
      calorias: 236,
      origemDado: "base",
      alimentoId: "aveia-em-flocos",
    });
  });

  it("preenche a justificativa a partir do catálogo, não do agent", async () => {
    gerarTreino.mockResolvedValue(okTreino);
    gerarNutricao.mockResolvedValue(okNutricao);

    const resultado = await gerarPlanoInicialComIA(entrada);

    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.valor.bloco.dias[0].exercicios[0].justificativa).toContain("peitoral");
  });

  it("indisponibiliza o plano inteiro quando o treino falha", async () => {
    gerarTreino.mockResolvedValue({ status: "indisponivel", contexto: {}, motivo: "timeout" });
    gerarNutricao.mockResolvedValue(okNutricao);

    expect(await gerarPlanoInicialComIA(entrada)).toMatchObject({ status: "indisponivel", motivo: "timeout" });
  });

  it("indisponibiliza o plano inteiro quando a nutrição falha", async () => {
    gerarTreino.mockResolvedValue(okTreino);
    gerarNutricao.mockResolvedValue({ status: "indisponivel", contexto: {}, motivo: "schema" });

    expect(await gerarPlanoInicialComIA(entrada)).toMatchObject({ status: "indisponivel", motivo: "schema" });
  });

  it("marca degradado quando qualquer uma das operações degradou", async () => {
    gerarTreino.mockResolvedValue({ ...okTreino, degradado: true });
    gerarNutricao.mockResolvedValue(okNutricao);

    expect(await gerarPlanoInicialComIA(entrada)).toMatchObject({ degradado: true });
  });
});
