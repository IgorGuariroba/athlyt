import { rotuloObjetivoComposicao } from "@/domain/triagem/etapas";
import type { ConfiancaCorporal, QualidadeMedicao } from "./index";

export const SCORECARD_CORPORAL_VERSAO = "scorecard-v1";
export interface DimensoesScorecard { aderencia: number; desempenho: number; tendenciaCorporal: number; recuperacao: number; utilidade: number }
export interface EvidenciaCorporal { sentido: "favor" | "contra"; descricao: string; fonte: string; qualidade: QualidadeMedicao; observadoEm?: Date; metodo?: string; protocolo?: string }

export function produzirRevisaoCorporal(entrada: {
  dimensoes: DimensoesScorecard;
  confiancas: ConfiancaCorporal;
  evidencias: EvidenciaCorporal[];
  semanasObservadas: number;
  riscoSaude?: boolean;
  reavaliacaoPendente?: {
    gatilho: "mudanca_objetivo";
    impacto: "estrutural";
    objetivoAnterior: string;
    objetivoNovo: string;
  };
}) {
  const valores = [
    entrada.dimensoes.aderencia,
    entrada.dimensoes.desempenho,
    entrada.dimensoes.tendenciaCorporal,
    entrada.dimensoes.recuperacao,
    entrada.dimensoes.utilidade,
  ];
  if (valores.some((valor) => !Number.isFinite(valor) || valor < 0 || valor > 100)) throw new Error("Dimensão do Scorecard fora da faixa.");
  const geral = Math.round(valores.reduce((total, valor) => total + valor, 0) / valores.length);
  const confiaveis = Object.values(entrada.confiancas).filter((valor) => valor === "confiavel").length;
  const contraAlta = entrada.evidencias.some((e) => e.sentido === "contra" && e.qualidade === "alta");
  const podePropor = entrada.semanasObservadas >= 2 && confiaveis >= 4 && !contraAlta && !entrada.riscoSaude;
  const proposta = entrada.riscoSaude
    ? { tipo: "manter" as const, exigeAprovacao: false, justificativa: "Saúde e recuperação prevalecem; mantenha o Plano Estável e investigue os sinais relatados." }
    : entrada.reavaliacaoPendente?.impacto === "estrutural"
      ? {
          tipo: "estrutural" as const,
          exigeAprovacao: true,
          gatilho: entrada.reavaliacaoPendente.gatilho,
          justificativa: `O objetivo mudou de ${rotuloObjetivoComposicao(entrada.reavaliacaoPendente.objetivoAnterior)} para ${rotuloObjetivoComposicao(entrada.reavaliacaoPendente.objetivoNovo)}; o Plano Ativo precisa de uma revisão estrutural antes de qualquer alteração.`,
        }
    : podePropor && entrada.dimensoes.recuperacao < 50 && entrada.confiancas.saudeRecuperacao === "confiavel"
      ? { tipo: "auto_aplicado" as const, exigeAprovacao: false, justificativa: "Recuperação baixa e confiável: reduzir até 10% do volume por uma versão e permitir desfazer.", ajuste: { tipo: "reduzir-volume" as const, limitePercentual: 10, regraVersao: "ajuste-recuperacao-v1" } }
      : podePropor && geral < 55
        ? { tipo: "estrutural" as const, exigeAprovacao: true, justificativa: "Evidências consistentes indicam que uma mudança estrutural pode ser avaliada." }
        : { tipo: "manter" as const, exigeAprovacao: false, justificativa: "Ainda não há evidência comparável suficiente para mudar o Plano Ativo." };
  return {
    scorecard: { ...entrada.dimensoes, geral, metodologiaVersao: SCORECARD_CORPORAL_VERSAO },
    confiancas: entrada.confiancas,
    evidencias: entrada.evidencias,
    proposta,
  };
}
