import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { syncConflicts, workoutEvents, workoutSessions } from "@/db/schema";
import { mesclarEventos, ordenarEventos, type ConflitoSincronizacao, type EstadoLocalSessao, type EventoOutbox } from "./outbox";
import type { ExercicioSessao } from "./repositorio";

/**
 * Recepção da fila offline (user story 39; telas 042 e 085).
 *
 * O endpoint é idempotente em dois níveis, de propósito. O merge puro
 * já é idempotente por construção, mas isso não basta sob corrida:
 * duas abas reconectando ao mesmo tempo passariam as duas pela mesma
 * leitura. O índice único em `client_event_id` fecha essa janela no
 * banco, e o `SELECT ... FOR UPDATE` da sessão serializa o lote.
 */

export interface ConflitoPendente extends ConflitoSincronizacao {
  id: string;
  sessionId: string;
  criadoEm: Date;
}

export interface ResultadoSincronizacao {
  aplicados: string[];
  duplicados: string[];
  conflitos: ConflitoPendente[];
}

function estadoDe(linha: typeof workoutSessions.$inferSelect): EstadoLocalSessao {
  return {
    estado: linha.estado,
    exercicios: linha.exercicios as ExercicioSessao[],
    motivoAbandono: linha.motivoAbandono,
  };
}

export async function sincronizarEventos(userId: string, sessionId: string, eventos: readonly EventoOutbox[]): Promise<ResultadoSincronizacao> {
  return db.transaction(async (tx) => {
    const [linha] = await tx.select().from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))).limit(1).for("update");
    if (!linha) throw new Error("Sessão não encontrada.");

    // Tudo que já entrou por esta fila antes — inclusive de um lote
    // anterior que falhou pela metade.
    const anteriores = await tx.select({ clientEventId: workoutEvents.clientEventId })
      .from(workoutEvents).where(eq(workoutEvents.sessionId, sessionId));
    const conflitosAbertos = await tx.select({ clientEventId: syncConflicts.clientEventId })
      .from(syncConflicts).where(and(eq(syncConflicts.sessionId, sessionId), isNull(syncConflicts.resolvidoEm)));
    const jaAplicados = new Set<string>([
      ...anteriores.map((e) => e.clientEventId).filter((id): id is string => id !== null),
      ...conflitosAbertos.map((c) => c.clientEventId),
    ]);

    const merge = mesclarEventos(estadoDe(linha), eventos, jaAplicados);
    const porId = new Map(ordenarEventos(eventos).map((e) => [e.id, e]));

    if (merge.aplicados.length > 0) {
      await tx.update(workoutSessions).set({
        exercicios: merge.estado.exercicios,
        estado: merge.estado.estado,
        motivoAbandono: merge.estado.motivoAbandono,
        endedAt: merge.estado.estado === "em_andamento" ? linha.endedAt : (linha.endedAt ?? new Date()),
      }).where(eq(workoutSessions.id, sessionId));

      await tx.insert(workoutEvents).values(merge.aplicados.map((id) => {
        const evento = porId.get(id)!;
        return {
          sessionId, userId, tipo: evento.tipo, dados: evento.dados,
          clientEventId: evento.id, ocorridoEm: new Date(evento.ocorridoEm), ordem: evento.ordem,
        };
      })).onConflictDoNothing({ target: workoutEvents.clientEventId });
    }

    if (merge.conflitos.length > 0) {
      await tx.insert(syncConflicts).values(merge.conflitos.map((conflito) => ({
        userId, sessionId, clientEventId: conflito.eventoId, motivo: conflito.motivo,
        servidor: conflito.servidor, dispositivo: conflito.dispositivo,
      }))).onConflictDoNothing({ target: syncConflicts.clientEventId });
    }

    return {
      aplicados: merge.aplicados,
      duplicados: merge.duplicados,
      conflitos: await listarConflitosDaSessao(tx, sessionId),
    };
  });
}

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

async function listarConflitosDaSessao(executor: Executor, sessionId: string): Promise<ConflitoPendente[]> {
  const linhas = await executor.select().from(syncConflicts)
    .where(and(eq(syncConflicts.sessionId, sessionId), isNull(syncConflicts.resolvidoEm)))
    .orderBy(asc(syncConflicts.createdAt));
  return linhas.map(mapearConflito);
}

function mapearConflito(linha: typeof syncConflicts.$inferSelect): ConflitoPendente {
  return {
    id: linha.id, sessionId: linha.sessionId, eventoId: linha.clientEventId, motivo: linha.motivo,
    servidor: linha.servidor as Record<string, unknown>,
    dispositivo: linha.dispositivo as Record<string, unknown>,
    criadoEm: linha.createdAt,
  };
}

/** Conflitos abertos do usuário, para a tela 085. */
export async function listarConflitosPendentes(userId: string): Promise<ConflitoPendente[]> {
  const linhas = await db.select().from(syncConflicts)
    .where(and(eq(syncConflicts.userId, userId), isNull(syncConflicts.resolvidoEm)))
    .orderBy(desc(syncConflicts.createdAt));
  return linhas.map(mapearConflito);
}

/**
 * Resolução explícita pelo atleta. Escolher "servidor" não apaga o
 * registro do dispositivo: a linha permanece, marcada como resolvida,
 * porque ela é a prova de que houve divergência.
 */
export async function resolverConflito(userId: string, conflitoId: string, escolha: "servidor" | "dispositivo"): Promise<void> {
  await db.transaction(async (tx) => {
    const [conflito] = await tx.select().from(syncConflicts)
      .where(and(eq(syncConflicts.id, conflitoId), eq(syncConflicts.userId, userId))).limit(1).for("update");
    if (!conflito || conflito.resolvidoEm) throw new Error("Conflito não encontrado ou já resolvido.");

    if (escolha === "dispositivo" && conflito.motivo === "serie_divergente") {
      const [linha] = await tx.select().from(workoutSessions).where(eq(workoutSessions.id, conflito.sessionId)).limit(1).for("update");
      const dados = conflito.dispositivo as { exercicioId?: string; numero?: number; cargaKg: number; repeticoes: number; rir: number };
      const exercicios = (linha.exercicios as ExercicioSessao[]).map((exercicio) => {
        if (exercicio.exercicioId !== dados.exercicioId) return exercicio;
        return { ...exercicio, series: exercicio.series.map((serie) => serie.numero === dados.numero
          ? { ...serie, cargaKg: dados.cargaKg, repeticoes: dados.repeticoes, rir: dados.rir, concluida: true }
          : serie) };
      });
      await tx.update(workoutSessions).set({ exercicios }).where(eq(workoutSessions.id, conflito.sessionId));
      await tx.insert(workoutEvents).values({
        sessionId: conflito.sessionId, userId, tipo: "serie_registrada", dados,
        clientEventId: conflito.clientEventId, ordem: null,
      }).onConflictDoNothing({ target: workoutEvents.clientEventId });
    }

    await tx.update(syncConflicts).set({ resolucao: escolha, resolvidoEm: new Date() }).where(eq(syncConflicts.id, conflitoId));
  });
}
