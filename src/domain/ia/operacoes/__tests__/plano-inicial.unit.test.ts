import { describe, expect, it, vi } from "vitest";

const decidir = vi.fn();
vi.mock("../../decidir", () => ({ decidir: (...args: unknown[]) => decidir(...args) }));

const { gerarPlanoInicialComIA, planoInicialSchema } = await import("../plano-inicial");

const nucleo = {
  perfilVersao: 7,
  modoConservador: false,
};

const plano = {
  regraVersao: "agent-plano-v1",
  modoConservador: false,
  prioridadesCorporais: ["ombros"],
  perfilVersao: 7,
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [],
  },
  nutricao: {
    calorias: 2400,
    proteinaG: 160,
    carboidratosG: 280,
    gordurasG: 70,
    fibrasG: 30,
    estrategia: "Manutenção com proteína distribuída",
    refeicoes: [],
  },
  dadosUsados: ["triagem-completa", "linha-base-corporal", "metas-proporcao"],
};

describe("gerarPlanoInicialComIA", () => {
  it("envia todo o recorte autorizado ao agent e devolve o plano estruturado", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: plano, contexto: {}, modeloResolvido: "anthropic/claude-sonnet-4.5", degradado: false });

    const resultado = await gerarPlanoInicialComIA({
      userId: "u1",
      nucleo,
      consentimentos: ["triagem-completa", "linha-base-corporal", "metas-proporcao", "historico-importado"],
      triagemCompleta: { objetivoComposicao: "ganhar-massa", horasSono: 8 },
      linhaBaseCorporal: {
        medicoes: [{ id: "m1", userId: "u1", regiao: "cintura", lado: "unico", valorMm: 820, qualidade: "alta", observadoEm: "2026-08-14", createdAt: "2026-08-14" }],
        pesos: [{ id: "p1", userId: "u1", pesoGramas: 80000, observadoEm: "2026-08-14", createdAt: "2026-08-14" }],
        gorduras: [],
        avaliacoesVisuais: [],
        fotosDisponiveis: [{ id: "f1", observadoEm: "2026-08-13" }],
      },
      metasProporcao: [{ id: "meta1", userId: "u1", ativa: true, regiao: "ombros", atualMm: 1100, faixaMinMm: 1120, faixaMaxMm: 1160, metaCicloMm: 1130, direcao: "aumentar", confianca: "moderada", justificativa: "Prioridade do ciclo", createdAt: "2026-08-14" }],
      historicoImportado: { disponivel: false },
      origem: { tela: "resumo-triagem", rota: "/triagem/resumo", gatilho: "clique-gerar-meu-plano" },
    });

    expect(resultado).toMatchObject({ status: "ok", valor: plano });
    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      operacao: "plano-inicial",
      nucleo,
      consentimentos: ["triagem-completa", "linha-base-corporal", "metas-proporcao", "historico-importado"],
      origem: { tela: "resumo-triagem", rota: "/triagem/resumo", gatilho: "clique-gerar-meu-plano" },
      dados: {
        "triagem-completa": { objetivoComposicao: "ganhar-massa", horasSono: 8 },
        "linha-base-corporal": {
          medicoes: [{ regiao: "cintura", lado: "unico", valorMm: 820, qualidade: "alta", observadoEm: "2026-08-14" }],
          pesos: [{ observadoEm: "2026-08-14", pesoKg: 80 }],
          gorduras: [],
          avaliacoesVisuais: [],
          fotos: { quantidade: 1, observadasEm: ["2026-08-13"] },
        },
        "metas-proporcao": [{ regiao: "ombros", atualMm: 1100, faixaMinMm: 1120, faixaMaxMm: 1160, metaCicloMm: 1130, direcao: "aumentar", confianca: "moderada", justificativa: "Prioridade do ciclo" }],
        "historico-importado": { disponivel: false },
      },
    }));
  });

  it("rejeita exercício inventado pelo modelo", () => {
    const invalido = {
      ...plano,
      bloco: {
        ...plano.bloco,
        dias: [{
          id: "dia-1",
          nome: "Superior",
          diaSemana: "segunda",
          exercicios: [{
            exercicioId: "exercicio-inventado",
            nome: "Exercício inventado",
            padrao: "empurrar-horizontal",
            series: 3,
            repeticoes: "8-12",
            rir: 2,
            descansoSeg: 90,
            justificativa: "Teste",
          }],
        }],
      },
    };

    expect(planoInicialSchema.safeParse(invalido).success).toBe(false);
  });
});
