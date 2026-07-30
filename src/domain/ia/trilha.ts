import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails } from "@/db/schema";
import type { ContextoDoAtleta } from "./contexto/montagem";
import type { OperacaoIA } from "./contexto/tipos";

/**
 * Trilha de Decisão (specs/mvp-vertical.md, user stories 91–92, 116).
 *
 * Registra o que foi usado, por qual modelo, em qual versão de
 * recorte e com qual resultado. A gravação acontece mesmo quando a
 * chamada falha ou degrada: uma decisão tomada sem IA também é uma
 * decisão auditável.
 */

export interface ChamadaFerramenta {
  nome: string;
  argumentos: unknown;
}

export interface RegistroDecisao {
  userId: string;
  operacao: OperacaoIA;
  recorteVersao: number;
  perfilVersao: number;
  /** Modelo efetivamente resolvido pelo provedor, não o nome lógico. */
  modeloResolvido: string | null;
  modeloSolicitado: string;
  camposEnviados: string[];
  camposOmitidos: string[];
  ferramentasConsultadas: ChamadaFerramenta[];
  degradado: boolean;
  /**
   * Falso quando o provedor não identificou o modelo resolvido — a
   * ADR 0005 trata esse caso como não auditável.
   */
  auditavel: boolean;
  resultado: unknown;
  erro?: string;
}

export async function registrarDecisao(
  registro: RegistroDecisao,
): Promise<void> {
  await db.insert(decisionTrails).values({
    userId: registro.userId,
    operacao: registro.operacao,
    recorteVersao: registro.recorteVersao,
    perfilVersao: registro.perfilVersao,
    modeloSolicitado: registro.modeloSolicitado,
    modeloResolvido: registro.modeloResolvido,
    auditavel: registro.auditavel,
    degradado: registro.degradado,
    camposEnviados: registro.camposEnviados,
    camposOmitidos: registro.camposOmitidos,
    ferramentasConsultadas: registro.ferramentasConsultadas,
    resultado: registro.resultado ?? null,
    erro: registro.erro ?? null,
  });
}

/**
 * Deriva os campos auditáveis a partir do contexto montado, para que
 * a trilha não possa divergir do que foi realmente enviado (ADR
 * 0006, invariante 2).
 */
export function camposDoContexto(contexto: ContextoDoAtleta): {
  camposEnviados: string[];
  camposOmitidos: string[];
} {
  return {
    camposEnviados: Object.keys(contexto.recorte),
    camposOmitidos: contexto.camposOmitidos,
  };
}

export async function listarTrilhas(userId: string, limite = 50) {
  return db
    .select()
    .from(decisionTrails)
    .where(eq(decisionTrails.userId, userId))
    .orderBy(desc(decisionTrails.createdAt))
    .limit(limite);
}
