import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, exerciseSubstitutions, plans, workoutEvents, workoutSessions } from "@/db/schema";
import { encontrarExercicio, regioesLesionadas } from "@/domain/plano/exercicios";
import { alternativasEquivalentes, motivoPersistente, type Alternativa, type MotivoSubstituicao } from "@/domain/plano/substituicoes";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import type { DiaTreino, ExplicacaoDecisao, PlanoGerado } from "@/domain/plano/tipos";
import type { ModalidadeProtocolo } from "./protocolo-execucao";

export type MotivoAbandono = "tempo" | "equipamento" | "dor" | "outro";
export type EstadoSessao = "em_andamento" | "concluida" | "abandonada";

export interface SerieSessao {
  numero: number;
  repeticoesSugeridas: string;
  cargaKg: number | null;
  cargaSugeridaKg: number;
  melhorCargaAnteriorKg: number;
  repeticoes: number | null;
  rir: number;
  concluida: boolean;
}
export interface ExercicioSessao {
  exercicioId: string; nome: string; descansoSeg: number; protocolo?: ModalidadeProtocolo; series: SerieSessao[];
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
  recordes: Array<{ exercicioId: string; nome: string; tipo: "maior_carga"; valor: number }>;
}

function planejarExercicios(dia: DiaTreino, melhoresCargas: Map<string, number>): ExercicioSessao[] {
  return dia.exercicios.map((exercicio) => ({
    exercicioId: exercicio.exercicioId, nome: exercicio.nome, descansoSeg: exercicio.descansoSeg, protocolo: exercicio.protocolo,
    // Congelada junto da prescrição: o snapshot existe para a sessão
    // continuar reproduzível depois de o plano evoluir, e o motivo faz
    // parte do que foi prescrito.
    explicacao: exercicio.explicacao,
    series: Array.from({ length: exercicio.series }, (_, indice) => ({
      numero: indice + 1, repeticoesSugeridas: exercicio.repeticoes, cargaKg: null,
      cargaSugeridaKg: melhoresCargas.get(exercicio.exercicioId) ?? 0,
      melhorCargaAnteriorKg: melhoresCargas.get(exercicio.exercicioId) ?? 0,
      repeticoes: null, rir: exercicio.rir, concluida: false,
    })),
  }));
}

async function melhoresCargasDoHistorico(userId: string): Promise<Map<string, number>> {
  const anteriores = await db.select({ exercicios: workoutSessions.exercicios }).from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.estado, "concluida")));
  const melhores = new Map<string, number>();
  for (const linha of anteriores) for (const exercicio of linha.exercicios as ExercicioSessao[]) {
    const maior = Math.max(0, ...exercicio.series.filter((serie) => serie.concluida).map((serie) => serie.cargaKg ?? 0));
    melhores.set(exercicio.exercicioId, Math.max(melhores.get(exercicio.exercicioId) ?? 0, maior));
  }
  return melhores;
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
  const melhoresCargas = await melhoresCargasDoHistorico(userId);
  const exercicios = await aplicarSubstituicoesPersistentes(userId, diaId, planejarExercicios(dia, melhoresCargas));
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

export async function registrarSerie(userId: string, sessionId: string, entrada: { exercicioId: string; numero: number; cargaKg: number; repeticoes: number; rir: number }): Promise<SessaoTreino> {
  if (entrada.cargaKg < 0 || entrada.repeticoes < 0 || entrada.rir < 0 || entrada.rir > 10) throw new Error("Valores da série inválidos.");
  return db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (!linha || linha.estado !== "em_andamento") throw new Error("Sessão não está em andamento.");
    const exercicios = structuredClone(linha.exercicios as ExercicioSessao[]);
    const exercicio = exercicios.find((item) => item.exercicioId === entrada.exercicioId);
    const serie = exercicio?.series.find((item) => item.numero === entrada.numero);
    if (!exercicio || !serie) throw new Error("Série não pertence à sessão.");
    Object.assign(serie, { cargaKg: entrada.cargaKg, repeticoes: entrada.repeticoes, rir: entrada.rir, concluida: true });
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
  if (!sessao || sessao.estado !== "em_andamento" || !exercicio?.series.some((serie) => serie.numero === entrada.proximaSerie && !serie.concluida)) {
    throw new Error("Alerta de Cautela não corresponde à próxima série.");
  }
  await db.insert(workoutEvents).values({
    sessionId,
    userId,
    tipo: "alerta_cautela_ignorado",
    dados: { ...entrada, decisao: "continuar" },
  });
}

function metricas(exercicios: ExercicioSessao[]) {
  const series = exercicios.flatMap((e) => e.series).filter((s) => s.concluida);
  return { totalSeries: series.length, volumeKg: series.reduce((total, s) => total + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0) };
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
  const anteriores = await db.select({ id: workoutSessions.id, exercicios: workoutSessions.exercicios }).from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.estado, "concluida")));
  const cargasAnteriores = new Map<string, number>();
  for (const linha of anteriores) {
    for (const exercicio of linha.exercicios as ExercicioSessao[]) {
      if (sessao.id === linha.id) continue;
      const maior = Math.max(0, ...exercicio.series.filter((s) => s.concluida).map((s) => s.cargaKg ?? 0));
      cargasAnteriores.set(exercicio.exercicioId, Math.max(cargasAnteriores.get(exercicio.exercicioId) ?? 0, maior));
    }
  }
  const recordes = sessao.exercicios.flatMap((exercicio) => {
    const valor = Math.max(0, ...exercicio.series.filter((s) => s.concluida).map((s) => s.cargaKg ?? 0));
    return valor > (cargasAnteriores.get(exercicio.exercicioId) ?? 0)
      ? [{ exercicioId: exercicio.exercicioId, nome: exercicio.nome, tipo: "maior_carga" as const, valor }]
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
    if (!linha || linha.estado !== "em_andamento") throw new Error("Sessão não está em andamento.");
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

async function aplicarSubstituicoesPersistentes(userId: string, diaId: string, exercicios: ExercicioSessao[]): Promise<ExercicioSessao[]> {
  const vigentes = await substituicoesVigentes(userId, diaId);
  if (vigentes.size === 0) return exercicios;
  const melhores = await melhoresCargasDoHistorico(userId);
  return exercicios.map((exercicio) => {
    const troca = vigentes.get(exercicio.exercicioId);
    const novo = troca ? encontrarExercicio(troca.exercicioNovoId) : undefined;
    return troca && novo ? trocarNoExercicio(exercicio, novo.id, novo.nome, troca.motivo, melhores.get(novo.id) ?? 0) : exercicio;
  });
}

function trocarNoExercicio(exercicio: ExercicioSessao, novoId: string, novoNome: string, motivo: MotivoSubstituicao, melhorCarga: number): ExercicioSessao {
  return {
    ...exercicio, exercicioId: novoId, nome: novoNome,
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
    series: exercicio.series.map((serie) => serie.concluida ? serie : { ...serie, cargaSugeridaKg: melhorCarga, melhorCargaAnteriorKg: melhorCarga }),
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
function dividirNaSubstituicao(exercicio: ExercicioSessao, novoId: string, novoNome: string, motivo: MotivoSubstituicao, melhorCarga: number): ExercicioSessao[] {
  const feitas = exercicio.series.filter((serie) => serie.concluida);
  const restantes = exercicio.series.filter((serie) => !serie.concluida);
  if (feitas.length === 0) return [trocarNoExercicio(exercicio, novoId, novoNome, motivo, melhorCarga)];

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
    substituiuExercicioId: exercicio.substituiuExercicioId ?? exercicio.exercicioId,
    substituiuNome: exercicio.substituiuNome ?? exercicio.nome,
    motivoSubstituicao: motivo,
    explicacao: undefined,
    interrompido: false,
    seriesPlanejadas: restantes.length,
    // A numeração recém-começa: as séries do substituto são dele, e
    // `registrarSerie` casa por (exercicioId, numero).
    series: restantes.map((serie, indice) => ({
      ...serie, numero: indice + 1, cargaKg: null, repeticoes: null,
      cargaSugeridaKg: melhorCarga, melhorCargaAnteriorKg: melhorCarga, concluida: false,
    })),
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
  const novo = encontrarExercicio(entrada.novoExercicioId)!;
  const melhores = await melhoresCargasDoHistorico(userId);
  const persistente = motivoPersistente(entrada.motivo);
  const perfilVersao = (await obterPerfilVigente(userId))?.version ?? 0;

  const atualizada = await db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (!linha || linha.estado !== "em_andamento") throw new Error("Sessão não está em andamento.");
    const exercicios = structuredClone(linha.exercicios as ExercicioSessao[]);
    const indice = exercicios.findIndex((item) => item.exercicioId === entrada.exercicioId);
    if (indice < 0) throw new Error("Exercício não pertence à sessão.");
    const original = exercicios[indice];
    if (original.interrompido) throw new Error("Este exercício já foi substituído nesta sessão.");
    const seriesJaFeitas = original.series.filter((serie) => serie.concluida).length;
    exercicios.splice(indice, 1, ...dividirNaSubstituicao(original, novo.id, novo.nome, entrada.motivo, melhores.get(novo.id) ?? 0));

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
