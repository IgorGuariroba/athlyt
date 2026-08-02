import { describe, expect, it } from "vitest";
import { avaliarCompatibilidadeFotos, consolidarAvaliacaoVisual } from "../avaliacao-visual";
import { produzirRevisaoCorporal } from "../revisao-corporal";

describe("Avaliação visual", () => {
  it("mantém critérios separados e gordura como faixa probabilística", () => {
    const resultado = consolidarAvaliacaoVisual({
      criterios: { vTaper: 72, ombros: 68, cintura: 61, equilibrio: 70, simetria: 66 },
      gorduraVisual: { minimoPercentual: 12, maximoPercentual: 16 },
      observacoes: ["Boa relação entre ombros e cintura"],
      limitacoes: ["Iluminação lateral diferente"],
    });
    expect(resultado.criterios).toEqual({ vTaper: 72, ombros: 68, cintura: 61, equilibrio: 70, simetria: 66 });
    expect(resultado.gorduraVisual).toEqual({ minimoBasisPoints: 1200, maximoBasisPoints: 1600 });
    expect(resultado.confianca).toBe("moderada");
    expect(resultado.metodologiaVersao).toBe("visual-v1");
  });

  it("rejeita faixa visual invertida ou estreita demais", () => {
    expect(() => consolidarAvaliacaoVisual({ criterios: { vTaper: 50, ombros: 50, cintura: 50, equilibrio: 50, simetria: 50 }, gorduraVisual: { minimoPercentual: 14, maximoPercentual: 14 }, observacoes: [], limitacoes: [] })).toThrow(/faixa/i);
  });

  it("compara somente mesma pose e sinaliza protocolo divergente", () => {
    expect(avaliarCompatibilidadeFotos({ poseAnterior: "frente", poseAtual: "frente", condicoesAnterior: "luz frontal", condicoesAtual: "luz lateral" })).toEqual({ comparavel: true, confianca: "limitada", motivos: ["Condições de captura diferentes"] });
    expect(avaliarCompatibilidadeFotos({ poseAnterior: "frente", poseAtual: "costas" }).comparavel).toBe(false);
  });
});

describe("Revisão Semanal corporal", () => {
  it("expõe cinco dimensões, evidências conflitantes e mantém plano quando a confiança é baixa", () => {
    const revisao = produzirRevisaoCorporal({
      dimensoes: { aderencia: 80, desempenho: 70, tendenciaCorporal: 60, recuperacao: 40, utilidade: 90 },
      confiancas: { composicaoCorporal: "limitada", proporcoes: "confiavel", simetriaBilateral: "indisponivel", treinamento: "confiavel", nutricao: "limitada", saudeRecuperacao: "limitada" },
      evidencias: [
        { sentido: "favor", descricao: "Cintura reduziu em três medições comparáveis", fonte: "circunferência", qualidade: "alta" },
        { sentido: "contra", descricao: "Fotos foram feitas com iluminação diferente", fonte: "foto", qualidade: "baixa" },
      ],
      semanasObservadas: 1,
    });
    expect(revisao.scorecard.geral).toBe(68);
    expect(revisao.evidencias).toHaveLength(2);
    expect(revisao.proposta.tipo).toBe("manter");
    expect(revisao.proposta.exigeAprovacao).toBe(false);
  });

  it("risco de saúde impede proposta estética mesmo com tendência favorável", () => {
    const revisao = produzirRevisaoCorporal({ dimensoes: { aderencia: 90, desempenho: 90, tendenciaCorporal: 90, recuperacao: 20, utilidade: 90 }, confiancas: { composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "confiavel", treinamento: "confiavel", nutricao: "confiavel", saudeRecuperacao: "limitada" }, evidencias: [], semanasObservadas: 4, riscoSaude: true });
    expect(revisao.proposta.tipo).toBe("manter");
    expect(revisao.proposta.justificativa).toMatch(/saúde|recuperação/i);
  });
});
