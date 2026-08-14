import { and, desc, eq, isNull } from "drizzle-orm";
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

/** Consentimento concedido, com a versão de recorte em que foi dado. */
export interface ConsentimentoRegistrado {
  campo: string;
  recorteVersao: number;
}

export interface EstadoConsentimento {
  /** Versão de recorte vigente hoje para a operação. */
  recorteVersao: number;
  /** Campos consentidos na versão vigente — os únicos enviáveis. */
  vigentes: string[];
  /**
   * Campos consentidos em versão anterior do recorte. Não são
   * enviáveis, mas existem: o usuário já disse sim uma vez e só
   * precisa reconfirmar o que mudou.
   */
  defasados: ConsentimentoRegistrado[];
  /** Campos nunca consentidos nesta operação. */
  ausentes: string[];
  /**
   * Verdadeiro quando o recorte evoluiu por baixo de um consentimento
   * já dado. Distinguir isso de "nunca consentiu" é o que evita a
   * operação rodar cega sem ninguém entender por quê.
   */
  precisaReconsentir: boolean;
}

/**
 * Classifica consentimentos gravados contra o recorte vigente.
 *
 * Separada do banco de propósito: a regra de "o recorte subiu de
 * versão" é justamente a que precisa ser testável sem infraestrutura.
 */
export function classificarConsentimentos(
  registrados: readonly ConsentimentoRegistrado[],
  recorte: { versao: number; campos: readonly { id: string }[] },
): EstadoConsentimento {
  const declarados = recorte.campos.map((campo) => campo.id);
  const vigentes: string[] = [];
  const defasados: ConsentimentoRegistrado[] = [];
  const ausentes: string[] = [];

  for (const id of declarados) {
    const doCampo = registrados.filter((item) => item.campo === id);
    if (doCampo.some((item) => item.recorteVersao === recorte.versao)) {
      vigentes.push(id);
      continue;
    }
    const anterior = doCampo
      .filter((item) => item.recorteVersao < recorte.versao)
      .sort((a, b) => b.recorteVersao - a.recorteVersao)[0];
    if (anterior) defasados.push(anterior);
    else ausentes.push(id);
  }

  return {
    recorteVersao: recorte.versao,
    vigentes,
    defasados,
    ausentes,
    precisaReconsentir: defasados.length > 0,
  };
}

/**
 * Estado completo do consentimento da operação, incluindo o que
 * caducou por mudança de recorte.
 */
export async function estadoConsentimento(
  userId: string,
  operacao: OperacaoIA,
): Promise<EstadoConsentimento> {
  const linhas = await db
    .select({ campo: consents.campo, recorteVersao: consents.recorteVersao })
    .from(consents)
    .where(
      and(
        eq(consents.userId, userId),
        eq(consents.operacao, operacao),
        isNull(consents.revogadoEm),
      ),
    )
    .orderBy(desc(consents.recorteVersao));

  return classificarConsentimentos(linhas, obterRecorte(operacao));
}

/**
 * Ids de campo com consentimento vigente. Consentimento é amarrado à
 * versão do recorte em que foi dado: se o recorte muda o que envia,
 * o consentimento anterior não cobre a versão nova.
 */
export async function consentimentosVigentes(
  userId: string,
  operacao: OperacaoIA,
): Promise<string[]> {
  return (await estadoConsentimento(userId, operacao)).vigentes;
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
