import { describe, expect, it } from "vitest";
import { produzirRevisaoCorporal } from "../revisao-corporal";

const confiancas = {
  composicaoCorporal: "confiavel",
  proporcoes: "confiavel",
  simetriaBilateral: "confiavel",
  treinamento: "confiavel",
  nutricao: "confiavel",
  saudeRecuperacao: "confiavel",
} as const;

describe("Revisão Semanal com mudança de objetivo pendente", () => {
  it("propõe mudança estrutural mesmo quando o Scorecard está positivo", () => {
    const revisao = produzirRevisaoCorporal({
      dimensoes: {
        aderencia: 90,
        desempenho: 85,
        tendenciaCorporal: 80,
        recuperacao: 90,
        utilidade: 85,
      },
      confiancas,
      evidencias: [],
      semanasObservadas: 4,
      reavaliacaoPendente: {
        gatilho: "mudanca_objetivo",
        impacto: "estrutural",
        objetivoAnterior: "ganhar-massa",
        objetivoNovo: "recomposicao",
      },
    });

    expect(revisao.proposta).toMatchObject({
      tipo: "estrutural",
      exigeAprovacao: true,
      gatilho: "mudanca_objetivo",
    });
  });
});
