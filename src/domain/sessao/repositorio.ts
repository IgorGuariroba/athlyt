import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { plans, workoutEvents, workoutSessions } from "@/db/schema";
import type { DiaTreino, PlanoGerado } from "@/domain/plano/tipos";

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
  exercicioId: string; nome: string; descansoSeg: number; series: SerieSessao[];
}
export interface EventoSessao { id: string; tipo: "sessao_iniciada" | "serie_registrada" | "sessao_concluida" | "sessao_abandonada"; dados: unknown; createdAt: Date }
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
    exercicioId: exercicio.exercicioId, nome: exercicio.nome, descansoSeg: exercicio.descansoSeg,
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
  return db.transaction(async (tx) => {
    const [linha] = await tx.insert(workoutSessions).values({
      userId, planId: plano.id, diaId, nome: dia.nome, estado: "em_andamento", exercicios: planejarExercicios(dia, melhoresCargas),
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

function metricas(exercicios: ExercicioSessao[]) {
  const series = exercicios.flatMap((e) => e.series).filter((s) => s.concluida);
  return { totalSeries: series.length, volumeKg: series.reduce((total, s) => total + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0) };
}

export async function concluirSessao(userId: string, sessionId: string): Promise<ResumoSessao> {
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
    if (estado === "concluida" && !(linha.exercicios as ExercicioSessao[]).every((exercicio) => exercicio.series.every((serie) => serie.concluida))) {
      throw new Error("Registre todas as séries planejadas antes de concluir.");
    }
    const [encerrada] = await tx.update(workoutSessions).set({ estado, endedAt: new Date(), motivoAbandono: motivo ?? null }).where(eq(workoutSessions.id, sessionId)).returning();
    await tx.insert(workoutEvents).values({ sessionId, userId, tipo: estado === "concluida" ? "sessao_concluida" : "sessao_abandonada", dados: motivo ? { motivo } : {} });
    return encerrada;
  });
  return mapear(atualizada);
}

export async function listarHistoricoSessoes(userId: string): Promise<SessaoTreino[]> {
  const linhas = await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.startedAt));
  return Promise.all(linhas.map(mapear));
}
