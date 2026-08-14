import type { ConfiancaCorporal, MetaProporcao } from "@/domain/medicoes";
import type { PadraoMovimento } from "./exercicios";

/**
 * Por que uma decisão do plano foi tomada **para este atleta**, com os
 * dados de origem que a sustentam. Difere da `justificativa` do
 * catálogo, que explica o exercício em abstrato.
 *
 * Opcional no tipo porque planos gravados antes desta fatia continuam
 * válidos no banco (Plano Ativo é imutável); a tela trata a ausência
 * em vez de inventar um texto.
 */
export interface ExplicacaoDecisao {
  porque: string;
  dadosUsados: Array<{ campo: string; valor: string }>;
}

export interface ExercicioPlanejado {
  exercicioId: string;
  nome: string;
  padrao: PadraoMovimento;
  series: number;
  repeticoes: string;
  rir: number;
  descansoSeg: number;
  justificativa: string;
  explicacao?: ExplicacaoDecisao;
}

export interface DiaTreino {
  id: string;
  nome: string;
  diaSemana: string;
  exercicios: ExercicioPlanejado[];
  explicacao?: ExplicacaoDecisao;
}

export interface BlocoTreino {
  duracaoSemanas: number;
  divisao: string;
  dias: DiaTreino[];
  explicacao?: ExplicacaoDecisao;
}

export interface MetaNutricional {
  calorias: number;
  proteinaG: number;
  carboidratosG: number;
  gordurasG: number;
  fibrasG: number;
  estrategia: string;
  refeicoes: Array<{
    nome: string;
    percentual: number;
    calorias: number;
    proteinaG: number;
    itens: string[];
    explicacao?: ExplicacaoDecisao;
  }>;
  explicacoes?: {
    calorias: ExplicacaoDecisao;
    proteinaG: ExplicacaoDecisao;
    carboidratosG: ExplicacaoDecisao;
    gordurasG: ExplicacaoDecisao;
    estrategia: ExplicacaoDecisao;
  };
}

export interface PlanoGerado {
  regraVersao: string;
  modoConservador: boolean;
  confiancaCorporal?: ConfiancaCorporal;
  metasProporcao?: MetaProporcao[];
  prioridadesCorporais?: string[];
  perfilVersao: number;
  bloco: BlocoTreino;
  nutricao: MetaNutricional;
  dadosUsados: string[];
}
