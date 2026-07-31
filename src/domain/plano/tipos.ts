import type { PadraoMovimento } from "./exercicios";

export interface ExercicioPlanejado {
  exercicioId: string;
  nome: string;
  padrao: PadraoMovimento;
  series: number;
  repeticoes: string;
  rir: number;
  descansoSeg: number;
  justificativa: string;
}

export interface DiaTreino {
  id: string;
  nome: string;
  diaSemana: string;
  exercicios: ExercicioPlanejado[];
}

export interface BlocoTreino {
  duracaoSemanas: number;
  divisao: string;
  dias: DiaTreino[];
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
  }>;
}

export interface PlanoGerado {
  regraVersao: string;
  modoConservador: boolean;
  perfilVersao: number;
  bloco: BlocoTreino;
  nutricao: MetaNutricional;
  dadosUsados: string[];
}
