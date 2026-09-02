import type { ConfiancaCorporal, MetaProporcao } from "@/domain/medicoes";
import type { ItemPlanejado } from "./item-planejado";
import type { PadraoMovimento } from "./exercicios";
import type { ModalidadeProtocolo } from "@/domain/sessao/protocolo-execucao";

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
  protocolo?: ModalidadeProtocolo;
  rir: number;
  descansoSeg: number;
  justificativa: string;
  explicacao?: ExplicacaoDecisao;
  /**
   * Instruções de execução traduzidas para português, vindas da
   * ExerciseDB via agent. Quando ausente, a tela usa o fallback
   * do catálogo estático (`DefinicaoExercicio.comoExecutar`).
   */
  comoExecutar?: string;
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
    /**
     * `string` mantém planos anteriores legíveis; todo plano novo usa
     * `ItemPlanejado`. A fronteira do Cardápio é quem discrimina —
     * telas nunca fazem cast entre os dois formatos.
     */
    itens: Array<string | ItemPlanejado>;
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
