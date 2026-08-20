/**
 * Mapa curado Athlyt → ExerciseDB (CONTEXT.md, Mídia de Execução):
 * liga o id estável do catálogo de exercícios (`exercicios.ts`) ao
 * exercício correspondente na ExerciseDB (AscendAPI, tier V1 OSS).
 *
 * A curadoria é manual, não fuzzy match: um nome parecido pode ser um
 * movimento diferente ("mergulho-banco" ≠ qualquer "dip" genérico), e
 * a tela ensinaria a execução errada durante a série — pior do que
 * nenhuma animação. `scripts/importar-midia-exercicios.ts --sugerir`
 * lista candidatos por busca, mas só entra aqui depois de revisão
 * humana comparando nome, padrão de movimento e equipamento.
 *
 * O mapa é intencionalmente parcial: 22 dos 32 exercícios do catálogo
 * têm entrada nesta primeira curadoria (ids em `exerciseId` conferidos
 * contra `GET /api/v1/exercises/{id}` em oss.exercisedb.dev). Os
 * exercícios ausentes usam o fallback em texto (`comoExecutar`) até
 * receberem uma correspondência de boa qualidade.
 */

export interface MidiaExecucao {
  /** Id do exercício na ExerciseDB — usado para baixar o GIF de origem. */
  exerciseId: string;
  /** Nome em inglês na ExerciseDB, para auditoria do mapeamento. */
  nomeOrigem: string;
  /** Chave estável no R2, derivada do id do catálogo Athlyt. */
  chaveObjeto: string;
}

function chaveObjetoDe(exercicioId: string): string {
  return `midia-execucao/${exercicioId}.gif`;
}

function entrada(exerciseId: string, nomeOrigem: string, exercicioId: string): MidiaExecucao {
  return { exerciseId, nomeOrigem, chaveObjeto: chaveObjetoDe(exercicioId) };
}

export const MIDIA_EXECUCAO: Readonly<Record<string, MidiaExecucao>> = {
  "supino-barra": entrada("EIeI8Vf", "barbell bench press", "supino-barra"),
  "supino-halteres": entrada("SpYC0Kp", "dumbbell bench press", "supino-halteres"),
  "supino-maquina-peito": entrada("jHAnWmT", "lever incline chest press", "supino-maquina-peito"),
  "flexao-de-braco": entrada("I4hDWkc", "push-up", "flexao-de-braco"),
  "crucifixo-cabo": entrada("lJJ7Yq8", "cable lying fly", "crucifixo-cabo"),

  "desenvolvimento-halteres": entrada("Xy4jlWA", "dumbbell arnold press", "desenvolvimento-halteres"),
  "desenvolvimento-maquina": entrada("903mzG8", "smith shoulder press", "desenvolvimento-maquina"),

  "elevacao-lateral-halteres": entrada("DsgkuIt", "dumbbell lateral raise", "elevacao-lateral-halteres"),
  "elevacao-lateral-elastico": entrada("goJ6ezq", "cable lateral raise", "elevacao-lateral-elastico"),

  "barra-fixa-pronada": entrada("lBDjFxJ", "pull-up", "barra-fixa-pronada"),
  "puxada-polia": entrada("RVwzP10", "cable pulldown", "puxada-polia"),
  "puxada-elastico": entrada("k6tUeqS", "band underhand pulldown", "puxada-elastico"),

  "remada-curvada-barra": entrada("eZyBC3j", "barbell bent over row", "remada-curvada-barra"),
  "remada-halteres": entrada("BJ0Hz5L", "dumbbell bent over row", "remada-halteres"),
  "remada-maquina-sentada": entrada("SJqRxOt", "cable rope seated row", "remada-maquina-sentada"),

  "agachamento-livre": entrada("Gnfo4FM", "barbell high bar squat", "agachamento-livre"),
  "leg-press-45": entrada("10Z2DXU", "sled 45° leg press", "leg-press-45"),
  "agachamento-halteres": entrada("HsvHqgf", "dumbbell squat", "agachamento-halteres"),

  "levantamento-terra-romeno": entrada("wQ2c4XD", "barbell romanian deadlift", "levantamento-terra-romeno"),

  "cadeira-extensora-ex": entrada("my33uHU", "lever leg extension", "cadeira-extensora-ex"),
  "mesa-flexora-ex": entrada("17lJ1kr", "lever lying leg curl", "mesa-flexora-ex"),

  "rosca-direta-halteres": entrada("NbVPDMW", "dumbbell biceps curl", "rosca-direta-halteres"),

  "triceps-polia": entrada("3ZflifB", "cable pushdown", "triceps-polia"),
  "triceps-halteres": entrada("mpKZGWz", "dumbbell lying triceps extension", "triceps-halteres"),
  "mergulho-banco": entrada("9RT8oQW", "bench dip on floor", "mergulho-banco"),

  "panturrilha-em-pe": entrada("dPmaUaU", "dumbbell standing calf raise", "panturrilha-em-pe"),

  "prancha": entrada("VBAWRPG", "weighted front plank", "prancha"),
};

export function midiaDoExercicio(exercicioId: string): MidiaExecucao | undefined {
  return MIDIA_EXECUCAO[exercicioId];
}
