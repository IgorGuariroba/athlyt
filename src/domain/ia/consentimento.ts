import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { obterRecorte } from "./contexto/recortes";
import type { OperacaoIA } from "./contexto/tipos";

/**
 * Consentimento por operação (user stories 105–107).
 *
 * O consentimento é por campo declarado do Recorte de Contexto, não
 * por categoria genérica: é isso que permite o texto exibido ser
 * derivado da declaração em vez de escrito à mão e ficar defasado
 * (ADR 0006, invariante 3).
 */

/**
 * Ids de campo com consentimento vigente. Consentimento é amarrado à
 * versão do recorte em que foi dado: se o recorte muda o que envia,
 * o consentimento anterior não cobre a versão nova.
 */
export async function consentimentosVigentes(
  userId: string,
  operacao: OperacaoIA,
): Promise<string[]> {
  const recorte = obterRecorte(operacao);

  const linhas = await db
    .select({ campo: consents.campo })
    .from(consents)
    .where(
      and(
        eq(consents.userId, userId),
        eq(consents.operacao, operacao),
        eq(consents.recorteVersao, recorte.versao),
        isNull(consents.revogadoEm),
      ),
    );

  return linhas.map((linha) => linha.campo);
}

export async function conceder(
  userId: string,
  operacao: OperacaoIA,
  campos: readonly string[],
  provedor: string,
): Promise<void> {
  const recorte = obterRecorte(operacao);
  const declarados = new Set(recorte.campos.map((c) => c.id));

  for (const campo of campos) {
    if (!declarados.has(campo)) {
      throw new Error(
        `Campo "${campo}" não é declarado pelo recorte "${operacao}".`,
      );
    }
  }

  if (campos.length === 0) return;

  await db.insert(consents).values(
    campos.map((campo) => ({
      userId,
      operacao,
      campo,
      recorteVersao: recorte.versao,
      provedor,
    })),
  );
}

/**
 * Revoga usos futuros sem apagar o registro histórico — a auditoria
 * de decisões passadas depende de saber que o consentimento existia
 * quando a decisão foi tomada (user story 107).
 */
export async function revogar(
  userId: string,
  operacao: OperacaoIA,
  campo: string,
): Promise<void> {
  await db
    .update(consents)
    .set({ revogadoEm: new Date() })
    .where(
      and(
        eq(consents.userId, userId),
        eq(consents.operacao, operacao),
        eq(consents.campo, campo),
        isNull(consents.revogadoEm),
      ),
    );
}
