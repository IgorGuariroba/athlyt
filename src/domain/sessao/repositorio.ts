import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, exerciseSubstitutions, plans, workoutEvents, workoutSessions } from "@/db/schema";
import { encontrarExercicio, regioesLesionadas } from "@/domain/plano/exercicios";
import { alternativasEquivalentes, motivoPersistente, type Alternativa, type MotivoSubstituicao } from "@/domain/plano/substituicoes";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import type { DiaTreino, ExplicacaoDecisao, PlanoGerado } from "@/domain/plano/tipos";
import { aplicarRegistroSerie, avaliarRegistroSerie, type EstadoLocalSessao } from "./outbox";
import type { ModalidadeProtocolo } from "./protocolo-execucao";
import { MARCA_ZERO, combinarMarcas, linhaDeMarcas, melhorMarca, melhorRecordeDaLinha, type MarcaExercicio, type TipoRecorde } from "./recorde";

export type MotivoAbandono = "tempo" | "equipamento" | "dor" | "outro";
export type EstadoSessao = "em_andamento" | "concluida" | "abandonada";

export interface SerieSessao {
  numero: number;
  repeticoesSugeridas: string;
  cargaKg: number | null;
  cargaSugeridaKg: number;
  repeticoes: number | null;
  rir: number;
  /** Meta de esforço congelada da prescrição; `rir` é a referência ou o realizado. */
  rirPrescrito?: number;
  concluida: boolean;
}
export interface ExercicioSessao {
  exercicioId: string; nome: string; descansoSeg: number; protocolo?: ModalidadeProtocolo; series: SerieSessao[];
  /**
   * Melhor marca histórica deste exercício antes desta sessão — carga,
   * volume e 1RM estimado. É a referência contra a qual "novo recorde"
   * é avaliado, e o único lugar onde ela mora: guardá-la também por
   * série fazia a substituição atualizar um campo e esquecer o outro.
   * Ausente em sessões anteriores a esta fatia, onde vale a marca zero
   * — o mesmo que um exercício sem histórico.
   */
  marcaAnterior?: MarcaExercicio;
  /**
   * Por que este exercício foi prescrito para este atleta, congelada do
   * Plano Ativo no início da sessão. Ausente em sessões anteriores a
   * esta fatia e em exercícios substituídos — o substituto vem de regra
   * determinística, não do agent, e não herda o motivo do original.
   */
  explicacao?: ExplicacaoDecisao;
  /** Presente quando este exercício entrou no lugar de outro. */
  substituiuExercicioId?: string;
  substituiuNome?: string;
  motivoSubstituicao?: MotivoSubstituicao;
  /**
   * Exercício encerrado antes do previsto porque foi substituído no
   * meio da execução. Mantém as séries que o atleta realmente fez
   * — elas são histórico de carga legítimo — e deixa de exigir as
   * que não fará.
   */
  interrompido?: boolean;
  seriesPlanejadas?: number;
  /**
   * Instruções de execução em português, preenchidas pelo agent
   * de planejamento via ExerciseDB. Quando ausente, a tela usa
   * o fallback do catálogo estático.
   */
  comoExecutar?: string;
}

export interface Substituicao {
  diaId: string; exercicioOriginalId: string; exercicioNovoId: string;
  motivo: MotivoSubstituicao; persistente: boolean; observacao: string | null; createdAt: Date;
}
export interface EventoSessao { id: string; tipo: "sessao_iniciada" | "serie_registrada" | "sessao_concluida" | "sessao_abandonada" | "exercicio_substituido" | "alerta_cautela_ignorado"; dados: unknown; createdAt: Date }
export interface SessaoTreino {
  id: string; diaId: string; nome: string; estado: EstadoSessao; exercicios: ExercicioSessao[];
  startedAt: Date; endedAt: Date | null; motivoAbandono: string | null; eventos: EventoSessao[];
}
export interface ResumoSessao extends SessaoTreino {
  totalSeries: number; volumeKg: number;
  recordes: { exercicioId: string; nome: string; tipo: TipoRecorde; valor: number; rotulo: string }[];
}

type UltimaSerie = Pick<SerieSessao, "cargaKg" | "repeticoes" | "rir">;

function chaveSerie(exercicioId: string, numero: number): string {
  return `${exercicioId}:${numero}`;
}

function planejarExercicios(dia: DiaTreino, marcas: Map<string, MarcaExercicio>, ultimasSeries: Map<string, UltimaSerie>): ExercicioSessao[] {
  return dia.exercicios.map((exercicio) => ({
    exercicioId: exercicio.exercicioId, nome: exercicio.nome, descansoSeg: exercicio.descansoSeg, protocolo: exercicio.protocolo,
    marcaAnterior: marcas.get(exercicio.exercicioId) ?? MARCA_ZERO,
    // Congelada junto da prescrição: o snapshot existe para a sessão
    // continuar reproduzível depois de o plano evoluir, e o motivo faz
    // parte do que foi prescrito.
    explicacao: exercicio.explicacao,
    series: Array.from({ length: exercicio.series }, (_, indice) => ({
      numero: indice + 1, repeticoesSugeridas: exercicio.repeticoes,
      cargaKg: ultimasSeries.get(chaveSerie(exercicio.exercicioId, indice + 1))?.cargaKg ?? null,
      cargaSugeridaKg: ultimasSeries.get(chaveSerie(exercicio.exercicioId, indice + 1))?.cargaKg ?? 0,
      repeticoes: ultimasSeries.get(chaveSerie(exercicio.exercicioId, indice + 1))?.repeticoes ?? null,
      rir: ultimasSeries.get(chaveSerie(exercicio.exercicioId, indice + 1))?.rir ?? exercicio.rir,
      rirPrescrito: exercicio.rir, concluida: false,
    })),
  }));
}

/**
 * Melhor marca por exercício no histórico concluído do atleta.
 * `exceto` permite excluir a própria sessão ao avaliar seus recordes.
 */
async function marcasDoHistorico(userId: string, exceto?: string): Promise<Map<string, MarcaExercicio>> {
  const anteriores = await db.select({ id: workoutSessions.id, exercicios: workoutSessions.exercicios }).from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.estado, "concluida")));
  const melhores = new Map<string, MarcaExercicio>();
  for (const linha of anteriores) {
    if (exceto && linha.id === exceto) continue;
    for (const exercicio of linha.exercicios as ExercicioSessao[]) {
      const marca = melhorMarca(exercicio.series.filter((serie) => serie.concluida));
      melhores.set(exercicio.exercicioId, combinarMarcas(melhores.get(exercicio.exercicioId) ?? MARCA_ZERO, marca));
    }
  }
  return melhores;
}

async function ultimasSeriesDoHistorico(userId: string): Promise<Map<string, UltimaSerie>> {
  const anteriores = await db.select({ exercicios: workoutSessions.exercicios }).from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), inArray(workoutSessions.estado, ["concluida", "abandonada"])))
    .orderBy(desc(workoutSessions.startedAt));
  const ultimas = new Map<string, UltimaSerie>();
  for (const linha of anteriores) {
    for (const exercicio of linha.exercicios as ExercicioSessao[]) {
      for (const serie of exercicio.series) {
        if (serie.concluida && !ultimas.has(chaveSerie(exercicio.exercicioId, serie.numero))) {
          ultimas.set(chaveSerie(exercicio.exercicioId, serie.numero), { cargaKg: serie.cargaKg, repeticoes: serie.repeticoes, rir: serie.rir });
        }
      }
    }
  }
  return ultimas;
}

async function eventos(sessionId: string): Promise<EventoSessao[]> {
  const linhas = await db.select().from(workoutEvents).where(eq(workoutEvents.sessionId, sessionId)).orderBy(asc(workoutEvents.createdAt), asc(workoutEvents.id));
  return linhas.map((e) => ({ id: e.id, tipo: e.tipo, dados: e.dados, createdAt: e.createdAt }));
}

async function mapear(linha: typeof workoutSessions.$inferSelect): Promise<SessaoTreino> {
  return {
    id: linha.id, diaId: linha.diaId, nome: linha.nome, estado: linha.estado,
    exercicios: linha.exercicios as ExercicioSessao[], startedAt: linha.startedAt,
    endedAt: linha.endedAt, motivoAbandono: linha.motivoAbandono, eventos: await eventos(linha.id),
  };
}

export async function iniciarSessao(userId: string, diaId: string): Promise<SessaoTreino> {
  const [emAndamento] = await db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.estado, "em_andamento"))).limit(1);
  if (emAndamento) return mapear(emAndamento);
  const [plano] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1);
  if (!plano) throw new Error("Plano Ativo não encontrado.");
  const dia = (plano.conteudo as PlanoGerado).bloco.dias.find((item) => item.id === diaId);
  if (!dia) throw new Error("Treino não pertence ao Plano Ativo.");
  const [marcas, ultimasSeries] = await Promise.all([marcasDoHistorico(userId), ultimasSeriesDoHistorico(userId)]);
  const exercicios = await aplicarSubstituicoesPersistentes(userId, diaId, planejarExercicios(dia, marcas, ultimasSeries), ultimasSeries);
  return db.transaction(async (tx) => {
    const [linha] = await tx.insert(workoutSessions).values({
      userId, planId: plano.id, diaId, nome: dia.nome, estado: "em_andamento", exercicios,
    }).returning();
    await tx.insert(workoutEvents).values({ sessionId: linha.id, userId, tipo: "sessao_iniciada", dados: { planoId: plano.id, diaId } });
    return mapear(linha);
  });
}

export async function obterSessao(userId: string, sessionId: string): Promise<SessaoTreino | null> {
  const [linha] = await db.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1);
  return linha ? mapear(linha) : null;
}

/**
 * Escrita síncrona de uma série.
 *
 * As regras do que é um registro admissível não moram aqui: são as
 * mesmas que a fila offline atravessa, e viviam duplicadas nos dois
 * caminhos. Este adapter mantém sua transação e seu `FOR UPDATE`, e
 * traduz o veredito para o contrato de erro que os chamadores já
 * conhecem.
 */
export async function registrarSerie(userId: string, sessionId: string, entrada: { exercicioId: string; numero: number; cargaKg: number; repeticoes: number; rir: number }): Promise<SessaoTreino> {
  return db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (!linha) throw new Error("Sessão não está em andamento.");
    const estado: EstadoLocalSessao = {
      estado: linha.estado, exercicios: linha.exercicios as ExercicioSessao[], motivoAbandono: linha.motivoAbandono,
    };

    const veredito = avaliarRegistroSerie(estado, { ...entrada });
    if (veredito.situacao === "inadmissivel") throw new Error("Valores da série inválidos.");
    if (veredito.situacao === "conflito") {
      // Sem fila no meio não há conflito a persistir: o chamador está
      // online e recebe a recusa na hora, pela mesma razão que o merge
      // registraria.
      throw new Error(veredito.motivo === "sessao_ja_encerrada" ? "Sessão não está em andamento." : "Série não pertence à sessão.");
    }

    const { exercicios } = aplicarRegistroSerie(estado, veredito.registro);
    const [atualizada] = await tx.update(workoutSessions).set({ exercicios }).where(eq(workoutSessions.id, sessionId)).returning();
    await tx.insert(workoutEvents).values({ sessionId, userId, tipo: "serie_registrada", dados: entrada });
    return mapear(atualizada);
  });
}

export async function registrarOverrideAlertaCautela(userId: string, sessionId: string, entrada: {
  exercicioId: string;
  proximaSerie: number;
  alerta: string;
}): Promise<void> {
  const sessao = await obterSessao(userId, sessionId);
  const exercicio = sessao?.exercicios.find((item) => item.exercicioId === entrada.exercicioId);
  if (sessao?.estado !== "em_andamento" || !exercicio?.series.some((serie) => serie.numero === entrada.proximaSerie && !serie.concluida)) {
    throw new Error("Alerta de Cautela não corresponde à próxima série.");
  }
  await db.insert(workoutEvents).values({
    sessionId,
    userId,
    tipo: "alerta_cautela_ignorado",
    dados: { ...entrada, decisao: "continuar" },
  });
}

const EXERCICIOS_PESO_CORPORAL = new Set([
  "barra-fixa-pronada",
  "flexao-de-braco",
  "mergulho-banco",
]);

/** Volume é carga externa × repetições. Peso corporal e modalidades
 * sem carga têm trabalho válido, mas não têm quilogramas externos para
 * entrar nesta métrica. */
function entraNoVolume(exercicio: ExercicioSessao): boolean {
  return (exercicio.protocolo ?? "repeticoes") === "repeticoes"
    && !EXERCICIOS_PESO_CORPORAL.has(exercicio.exercicioId);
}

export function metricas(exercicios: ExercicioSessao[]) {
  const series = exercicios.flatMap((e) => e.series).filter((s) => s.concluida);
  const volumeSeries = exercicios.flatMap((e) => entraNoVolume(e) ? e.series : [])
    .filter((s) => s.concluida);
  return {
    totalSeries: series.length,
    volumeKg: volumeSeries.reduce((total, s) => total + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0),
  };
}

export async function concluirSessao(userId: string, sessionId: string): Promise<ResumoSessao> {
  // A ação pode ser reenviada pelo navegador (duplo clique, retry de uma
  // Server Action ou retorno à página). Concluir é idempotente: se a sessão
  // já terminou, apenas devolvemos o mesmo resumo em vez de falhar.
  const sessao = await obterSessao(userId, sessionId);
  if (!sessao) throw new Error("Sessão não encontrada.");
  if (sessao.estado === "concluida") return obterResumoSessao(userId, sessao);
  return obterResumoSessao(userId, await encerrar(userId, sessionId, "concluida"));
}

export function resumirSessao(sessao: SessaoTreino): ResumoSessao {
  return { ...sessao, ...metricas(sessao.exercicios), recordes: [] };
}

export async function obterResumoSessao(userId: string, sessaoOuId: SessaoTreino | string): Promise<ResumoSessao> {
  const sessao = typeof sessaoOuId === "string" ? await obterSessao(userId, sessaoOuId) : sessaoOuId;
  if (!sessao) throw new Error("Sessão não encontrada.");
  const marcasAnteriores = await marcasDoHistorico(userId, sessao.id);
  // A melhor série da sessão é comparada à melhor marca histórica do
  // mesmo exercício, em intensidade (1RM estimado), carga e volume —
  // não apenas ao maior peso, que ignora as repetições.
  const recordes = sessao.exercicios.flatMap((exercicio) => {
    if (!entraNoVolume(exercicio)) return [];
    const historico = marcasAnteriores.get(exercicio.exercicioId) ?? exercicio.marcaAnterior ?? MARCA_ZERO;
    const recorde = melhorRecordeDaLinha(linhaDeMarcas({
      historico,
      series: exercicio.series.map((serie) => ({ ...serie, registrada: serie.concluida })),
    }));
    return recorde
      ? [{ exercicioId: exercicio.exercicioId, nome: exercicio.nome, tipo: recorde.tipo, valor: recorde.valor, rotulo: recorde.rotulo }]
      : [];
  });
  return { ...sessao, ...metricas(sessao.exercicios), recordes };
}

export async function abandonarSessao(userId: string, sessionId: string, motivo: MotivoAbandono): Promise<SessaoTreino> {
  return encerrar(userId, sessionId, "abandonada", motivo);
}

async function encerrar(userId: string, sessionId: string, estado: "concluida" | "abandonada", motivo?: MotivoAbandono): Promise<SessaoTreino> {
  const atualizada = await db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (linha?.estado !== "em_andamento") throw new Error("Sessão não está em andamento.");
    const [encerrada] = await tx.update(workoutSessions).set({ estado, endedAt: new Date(), motivoAbandono: motivo ?? null }).where(eq(workoutSessions.id, sessionId)).returning();
    await tx.insert(workoutEvents).values({ sessionId, userId, tipo: estado === "concluida" ? "sessao_concluida" : "sessao_abandonada", dados: motivo ? { motivo } : {} });
    return encerrada;
  });
  return mapear(atualizada);
}

/**
 * Substituições persistentes já registradas para o dia, indexadas
 * pelo exercício original; a mais recente vence. É o que dá estabilidade aos
 * exercícios-chave: quem trocou por falta de equipamento ou por dor
 * não precisa repetir a troca toda sessão, e quem trocou por
 * preferência volta ao exercício prescrito na sessão seguinte.
 */
async function substituicoesVigentes(userId: string, diaId: string): Promise<Map<string, Substituicao>> {
  const linhas = await db.select().from(exerciseSubstitutions)
    .where(and(eq(exerciseSubstitutions.userId, userId), eq(exerciseSubstitutions.diaId, diaId), eq(exerciseSubstitutions.persistente, true)))
    .orderBy(asc(exerciseSubstitutions.createdAt));
  const vigentes = new Map<string, Substituicao>();
  for (const linha of linhas) {
    vigentes.set(linha.exercicioOriginalId, {
      diaId: linha.diaId, exercicioOriginalId: linha.exercicioOriginalId, exercicioNovoId: linha.exercicioNovoId,
      motivo: linha.motivo, persistente: linha.persistente, observacao: linha.observacao, createdAt: linha.createdAt,
    });
  }
  return vigentes;
}

async function aplicarSubstituicoesPersistentes(userId: string, diaId: string, exercicios: ExercicioSessao[], ultimasSeries: Map<string, UltimaSerie>): Promise<ExercicioSessao[]> {
  const vigentes = await substituicoesVigentes(userId, diaId);
  if (vigentes.size === 0) return exercicios;
  const marcas = await marcasDoHistorico(userId);
  return exercicios.map((exercicio) => {
    const troca = vigentes.get(exercicio.exercicioId);
    const novo = troca ? encontrarExercicio(troca.exercicioNovoId) : undefined;
    return troca && novo ? trocarNoExercicio(exercicio, novo.id, novo.nome, troca.motivo, marcas.get(novo.id) ?? MARCA_ZERO, ultimasSeries) : exercicio;
  });
}

function trocarNoExercicio(exercicio: ExercicioSessao, novoId: string, novoNome: string, motivo: MotivoSubstituicao, marcaDoNovo: MarcaExercicio, ultimasSeries = new Map<string, UltimaSerie>()): ExercicioSessao {
  return {
    ...exercicio, exercicioId: novoId, nome: novoNome,
    // A marca a bater passa a ser a do exercício que o atleta vai
    // fazer agora: trocar supino reto por supino com halteres muda a
    // barra, e medir as séries de halteres contra o recorde da barra
    // negaria um recorde legítimo.
    marcaAnterior: marcaDoNovo,
    // A explicação justificava *aquele* exercício para este atleta. O
    // substituto vem de regra determinística, não do agent: herdar o
    // texto seria atribuir a ele um motivo que ninguém produziu.
    explicacao: undefined,
    substituiuExercicioId: exercicio.substituiuExercicioId ?? exercicio.exercicioId,
    substituiuNome: exercicio.substituiuNome ?? exercicio.nome,
    motivoSubstituicao: motivo,
    // A prescrição (séries, reps, RIR, descanso) permanece: o que muda
    // é o exercício, não o estímulo pretendido. As cargas voltam à
    // referência histórica do novo exercício, que é outra barra.
    series: exercicio.series.map((serie) => {
      if (serie.concluida) return serie;
      const ultima = ultimasSeries.get(chaveSerie(novoId, serie.numero));
      return {
        ...serie,
        cargaKg: ultima?.cargaKg ?? null,
        cargaSugeridaKg: ultima?.cargaKg ?? 0,
        repeticoes: ultima?.repeticoes ?? null,
        rir: ultima?.rir ?? serie.rirPrescrito ?? serie.rir,
      };
    }),
  };
}

/**
 * Substituição no meio da execução: o problema que motiva a troca
 * costuma aparecer *durante* o exercício — uma dor que só se
 * manifesta na segunda série é o caso central, não a exceção.
 *
 * O que foi executado não pode ser reescrito, então a troca não
 * sobrescreve: o exercício original fica na sessão com as séries que
 * o atleta de fato fez, marcado como interrompido, e o substituto
 * entra logo em seguida com as séries que restavam. A sessão continua
 * somando o mesmo número de séries, e o histórico de carga de cada
 * exercício continua sendo dele.
 */
function dividirNaSubstituicao(exercicio: ExercicioSessao, novoId: string, novoNome: string, motivo: MotivoSubstituicao, marcaDoNovo: MarcaExercicio, ultimasSeries: Map<string, UltimaSerie>): ExercicioSessao[] {
  const feitas = exercicio.series.filter((serie) => serie.concluida);
  const restantes = exercicio.series.filter((serie) => !serie.concluida);
  if (feitas.length === 0) return [trocarNoExercicio(exercicio, novoId, novoNome, motivo, marcaDoNovo, ultimasSeries)];

  const interrompido: ExercicioSessao = {
    ...exercicio,
    series: feitas,
    interrompido: true,
    seriesPlanejadas: exercicio.seriesPlanejadas ?? exercicio.series.length,
    motivoSubstituicao: motivo,
  };
  const substituto: ExercicioSessao = {
    ...exercicio,
    exercicioId: novoId,
    nome: novoNome,
    // Ver `trocarNoExercicio`: a referência histórica é do exercício
    // substituto, não a herdada do que foi interrompido.
    marcaAnterior: marcaDoNovo,
    substituiuExercicioId: exercicio.substituiuExercicioId ?? exercicio.exercicioId,
    substituiuNome: exercicio.substituiuNome ?? exercicio.nome,
    motivoSubstituicao: motivo,
    explicacao: undefined,
    interrompido: false,
    seriesPlanejadas: restantes.length,
    // A numeração recém-começa: as séries do substituto são dele, e
    // `registrarSerie` casa por (exercicioId, numero).
    series: restantes.map((serie, indice) => {
      const numero = indice + 1;
      const ultima = ultimasSeries.get(chaveSerie(novoId, numero));
      return {
        ...serie, numero,
        cargaKg: ultima?.cargaKg ?? null,
        repeticoes: ultima?.repeticoes ?? null,
        rir: ultima?.rir ?? serie.rirPrescrito ?? serie.rir,
        cargaSugeridaKg: ultima?.cargaKg ?? 0,
        concluida: false,
      };
    }),
  };
  return [interrompido, substituto];
}

/**
 * Alternativas oferecidas para um exercício da sessão em andamento,
 * já filtradas pelo equipamento e pelas limitações do perfil vigente.
 */
export async function alternativasParaSessao(userId: string, sessionId: string, entrada: { exercicioId: string; motivo: MotivoSubstituicao; relatoDor?: string }): Promise<Alternativa[]> {
  const sessao = await obterSessao(userId, sessionId);
  if (!sessao) throw new Error("Sessão não encontrada.");
  const perfil = await obterPerfilVigente(userId);
  const respostas = perfil?.respostas ?? {};
  const plano = await db.select({ modoConservador: plans.modoConservador }).from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1);
  return alternativasEquivalentes({
    exercicioId: entrada.exercicioId,
    motivo: entrada.motivo,
    equipamentos: respostas.equipamentos ?? [],
    regioesLesionadas: regioesLesionadas(respostas.lesoes),
    regioesDoloridas: regioesLesionadas(entrada.relatoDor),
    modoConservador: plano[0]?.modoConservador ?? false,
    exerciciosNoTreino: sessao.exercicios.map((e) => e.exercicioId),
  });
}

/**
 * Troca um exercício da sessão em andamento. Séries já registradas
 * bloqueiam a troca: o histórico de carga pertence ao exercício que
 * foi de fato executado, e reescrevê-lo falsificaria a progressão.
 */
export async function substituirExercicioNaSessao(userId: string, sessionId: string, entrada: { exercicioId: string; novoExercicioId: string; motivo: MotivoSubstituicao; observacao?: string }): Promise<SessaoTreino> {
  // A alternativa é revalidada no servidor: a lista mostrada na tela
  // não é autoridade sobre o que é viável para este perfil.
  const alternativas = await alternativasParaSessao(userId, sessionId, { exercicioId: entrada.exercicioId, motivo: entrada.motivo, relatoDor: entrada.observacao });
  const escolhida = alternativas.find((a) => a.exercicioId === entrada.novoExercicioId);
  if (!escolhida) throw new Error("Alternativa não preserva o estímulo ou não é viável para o seu perfil.");
  const novo = encontrarExercicio(entrada.novoExercicioId);
  if (!novo) throw new Error("Exercício não encontrado.");
  const [marcas, ultimasSeries] = await Promise.all([
    marcasDoHistorico(userId),
    ultimasSeriesDoHistorico(userId),
  ]);
  const persistente = motivoPersistente(entrada.motivo);
  const perfilVersao = (await obterPerfilVigente(userId))?.version ?? 0;

  const atualizada = await db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (linha?.estado !== "em_andamento") throw new Error("Sessão não está em andamento.");
    const exercicios = structuredClone(linha.exercicios as ExercicioSessao[]);
    const indice = exercicios.findIndex((item) => item.exercicioId === entrada.exercicioId);
    if (indice < 0) throw new Error("Exercício não pertence à sessão.");
    const original = exercicios[indice];
    if (original.interrompido) throw new Error("Este exercício já foi substituído nesta sessão.");
    const seriesJaFeitas = original.series.filter((serie) => serie.concluida).length;
    exercicios.splice(indice, 1, ...dividirNaSubstituicao(original, novo.id, novo.nome, entrada.motivo, marcas.get(novo.id) ?? MARCA_ZERO, ultimasSeries));

    const [atualizada] = await tx.update(workoutSessions).set({ exercicios }).where(eq(workoutSessions.id, sessionId)).returning();
    const dados = { de: entrada.exercicioId, para: entrada.novoExercicioId, motivo: entrada.motivo, preservaEstimulo: escolhida.preservaEstimulo, persistente, observacao: entrada.observacao ?? null, seriesJaFeitas };
    await tx.insert(workoutEvents).values({ sessionId, userId, tipo: "exercicio_substituido", dados });
    await tx.insert(exerciseSubstitutions).values({
      userId, sessionId, diaId: linha.diaId, exercicioOriginalId: original.substituiuExercicioId ?? entrada.exercicioId,
      exercicioNovoId: entrada.novoExercicioId, motivo: entrada.motivo, observacao: entrada.observacao ?? null, persistente,
    });
    await tx.insert(decisionTrails).values({
      userId, operacao: "copiloto-sessao", recorteVersao: 1, perfilVersao,
      modeloSolicitado: "motor-adaptativo", modeloResolvido: "motor-substituicao-v1", auditavel: true, degradado: false,
      camposEnviados: ["equipamentos", "lesoes", "exerciciosDaSessao"], camposOmitidos: [], ferramentasConsultadas: [],
      resultado: { tipo: "substituicao-em-sessao", sessionId, ...dados, justificativa: escolhida.justificativa },
    });
    return atualizada;
  });
  // `mapear` lê eventos fora da transação de propósito: dentro dela o
  // insert recém-feito ainda não estaria visível à conexão do pool.
  return mapear(atualizada);
}

export async function listarSubstituicoes(userId: string, diaId?: string): Promise<Substituicao[]> {
  const linhas = await db.select().from(exerciseSubstitutions)
    .where(diaId ? and(eq(exerciseSubstitutions.userId, userId), eq(exerciseSubstitutions.diaId, diaId)) : eq(exerciseSubstitutions.userId, userId))
    .orderBy(desc(exerciseSubstitutions.createdAt));
  return linhas.map((linha) => ({
    diaId: linha.diaId, exercicioOriginalId: linha.exercicioOriginalId, exercicioNovoId: linha.exercicioNovoId,
    motivo: linha.motivo, persistente: linha.persistente, observacao: linha.observacao, createdAt: linha.createdAt,
  }));
}

export async function listarHistoricoSessoes(userId: string): Promise<SessaoTreino[]> {
  const linhas = await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.startedAt));
  return Promise.all(linhas.map(mapear));
}
