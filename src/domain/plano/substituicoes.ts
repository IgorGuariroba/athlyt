/**
 * Substituição de exercício preservando o estímulo.
 *
 * Regra central: o app nunca troca exercício por variedade. Uma troca
 * só existe porque o usuário declarou um motivo — equipamento
 * indisponível, dor/desconforto ou preferência explícita — e a
 * alternativa oferecida precisa cobrir o mesmo padrão de movimento
 * antes de qualquer outra consideração. Só quando nenhum exercício do
 * padrão sobra é que se aceita um vizinho do mesmo grupo muscular,
 * sempre sinalizado como estímulo aproximado.
 */

import {
  encontrarExercicio,
  exerciciosElegiveis,
  type DefinicaoExercicio,
  type RegiaoCorporal,
} from "./exercicios";

export type MotivoSubstituicao = "equipamento" | "dor" | "preferencia";

export const MOTIVOS_SUBSTITUICAO: readonly {
  id: MotivoSubstituicao;
  rotulo: string;
  descricao: string;
  /** Motivo persistente vale para as próximas sessões do bloco. */
  persistente: boolean;
}[] = [
  {
    id: "equipamento",
    rotulo: "Equipamento indisponível",
    descricao: "O aparelho está ocupado ou não existe onde você treina hoje.",
    persistente: true,
  },
  {
    id: "dor",
    rotulo: "Dor ou desconforto",
    descricao: "O movimento incomoda uma articulação ou região específica.",
    persistente: true,
  },
  {
    id: "preferencia",
    rotulo: "Preferência pessoal",
    descricao: "Você prefere outro exercício apenas nesta sessão.",
    persistente: false,
  },
];

export const AVISO_VARIEDADE =
  "O plano não troca exercícios por variedade: manter o mesmo movimento por algumas semanas é o que permite comparar progressão. Troque quando houver um motivo real.";

export interface Alternativa {
  exercicioId: string;
  nome: string;
  /** Mesmo padrão de movimento = estímulo preservado. */
  preservaEstimulo: boolean;
  justificativa: string;
}

export interface EntradaAlternativas {
  exercicioId: string;
  motivo: MotivoSubstituicao;
  equipamentos: readonly string[];
  regioesLesionadas: readonly RegiaoCorporal[];
  modoConservador: boolean;
  /** Regiões citadas na dor relatada agora, além das lesões do perfil. */
  regioesDoloridas?: readonly RegiaoCorporal[];
  /** Exercícios já presentes no treino — evita duplicar movimento. */
  exerciciosNoTreino?: readonly string[];
}

function restricoes(entrada: EntradaAlternativas): Set<RegiaoCorporal> {
  return new Set([
    ...entrada.regioesLesionadas,
    ...(entrada.motivo === "dor" ? (entrada.regioesDoloridas ?? []) : []),
  ]);
}

function justificar(
  candidato: DefinicaoExercicio,
  atual: DefinicaoExercicio,
  motivo: MotivoSubstituicao,
): string {
  const equivalencia =
    candidato.padrao === atual.padrao
      ? `Mesmo padrão de ${atual.padrao.replace(/-/g, " ")}, preservando o estímulo prescrito.`
      : `Mesmo grupo muscular (${atual.grupoPrimario}); o padrão muda, então o estímulo é aproximado.`;
  const contexto =
    motivo === "equipamento"
      ? "Viável com o equipamento que você declarou ter."
      : motivo === "dor"
        ? "Não carrega a região que você relatou como dolorida."
        : "Alternativa dentro dos limites do seu perfil.";
  return `${equivalencia} ${contexto}`;
}

/**
 * Alternativas ranqueadas para um exercício da sessão. A ordem é
 * determinística: primeiro as que preservam o padrão, depois as do
 * mesmo grupo muscular, cada bloco pela prioridade do catálogo.
 * Exercícios já presentes no treino ficam de fora — trocar por algo
 * que o atleta já vai fazer duplicaria volume em vez de substituí-lo.
 */
export function alternativasEquivalentes(
  entrada: EntradaAlternativas,
): Alternativa[] {
  const atual = encontrarExercicio(entrada.exercicioId);
  if (!atual) return [];
  const proibidas = restricoes(entrada);
  const jaNoTreino = new Set(entrada.exerciciosNoTreino ?? []);
  const elegiveis = exerciciosElegiveis({
    equipamentos: entrada.equipamentos,
    regioesLesionadas: [...proibidas],
    modoConservador: entrada.modoConservador,
  });

  return elegiveis
    .filter(
      (candidato) =>
        candidato.id !== atual.id &&
        !jaNoTreino.has(candidato.id) &&
        (candidato.padrao === atual.padrao ||
          candidato.grupoPrimario === atual.grupoPrimario),
    )
    .sort((a, b) => {
      const pesoA = a.padrao === atual.padrao ? 0 : 1;
      const pesoB = b.padrao === atual.padrao ? 0 : 1;
      return pesoA === pesoB ? a.prioridade - b.prioridade : pesoA - pesoB;
    })
    .map((candidato) => ({
      exercicioId: candidato.id,
      nome: candidato.nome,
      preservaEstimulo: candidato.padrao === atual.padrao,
      justificativa: justificar(candidato, atual, entrada.motivo),
    }));
}

export function motivoPersistente(motivo: MotivoSubstituicao): boolean {
  return MOTIVOS_SUBSTITUICAO.some((m) => m.id === motivo && m.persistente);
}
