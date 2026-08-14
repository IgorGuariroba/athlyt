import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { planReassessments, plans, profileVersions } from "@/db/schema";
import type {
  ObjetivoComposicao,
  RespostasTriagem,
} from "@/domain/triagem/etapas";

export type ResultadoMudancaObjetivo =
  | { alterado: false; motivo: "objetivo_ja_vigente" }
  | {
      alterado: true;
      perfilVersaoAnterior: number;
      perfilVersaoNova: number;
      planoAtivoId: string;
      planoJaAlinhado: true;
      reavaliacao: null;
    }
  | {
      alterado: true;
      perfilVersaoAnterior: number;
      perfilVersaoNova: number;
      planoAtivoId: string;
      planoJaAlinhado: false;
      reavaliacao: typeof planReassessments.$inferSelect;
    };

/**
 * Registra uma mudança estrutural do Contexto do Atleta sem alterar o Plano
 * Ativo. Perfil e solicitação são gravados na mesma transação para que nunca
 * exista uma nova versão sem a reavaliação correspondente.
 */
export async function solicitarMudancaDeObjetivo(
  userId: string,
  objetivoNovo: ObjetivoComposicao,
): Promise<ResultadoMudancaObjetivo> {
  return db.transaction(async (tx) => {
    const [perfil] = await tx
      .select()
      .from(profileVersions)
      .where(eq(profileVersions.userId, userId))
      .orderBy(desc(profileVersions.version))
      .limit(1)
      .for("update");
    if (!perfil) throw new Error("Perfil vigente não encontrado.");

    const respostas = perfil.respostas as RespostasTriagem;
    const objetivoAnterior = respostas.objetivoComposicao;
    if (!objetivoAnterior) throw new Error("Objetivo vigente não encontrado.");
    if (objetivoAnterior === objetivoNovo) {
      return { alterado: false, motivo: "objetivo_ja_vigente" };
    }

    const [planoAtivo] = await tx
      .select()
      .from(plans)
      .where(and(eq(plans.userId, userId), eq(plans.estado, "ativo")))
      .limit(1)
      .for("update");
    if (!planoAtivo) throw new Error("Plano Ativo não encontrado.");

    const [perfilDoPlanoAtivo] = await tx
      .select()
      .from(profileVersions)
      .where(
        and(
          eq(profileVersions.userId, userId),
          eq(profileVersions.version, planoAtivo.perfilVersao),
        ),
      )
      .limit(1);
    const objetivoDoPlanoAtivo = (perfilDoPlanoAtivo?.respostas as RespostasTriagem | undefined)
      ?.objetivoComposicao;

    const perfilVersaoNova = perfil.version + 1;
    await tx.insert(profileVersions).values({
      userId,
      version: perfilVersaoNova,
      respostas: { ...respostas, objetivoComposicao: objetivoNovo },
    });

    await tx
      .update(planReassessments)
      .set({ estado: "cancelada", resolvedAt: new Date() })
      .where(
        and(
          eq(planReassessments.userId, userId),
          eq(planReassessments.estado, "pendente"),
        ),
      );

    if (objetivoDoPlanoAtivo === objetivoNovo) {
      return {
        alterado: true,
        perfilVersaoAnterior: perfil.version,
        perfilVersaoNova,
        planoAtivoId: planoAtivo.id,
        planoJaAlinhado: true,
        reavaliacao: null,
      };
    }

    const [reavaliacao] = await tx
      .insert(planReassessments)
      .values({
        userId,
        gatilho: "mudanca_objetivo",
        impacto: "estrutural",
        baselinePlanId: planoAtivo.id,
        perfilVersaoAnterior: perfil.version,
        perfilVersaoNova,
        objetivoAnterior,
        objetivoNovo,
      })
      .returning();

    return {
      alterado: true,
      perfilVersaoAnterior: perfil.version,
      perfilVersaoNova,
      planoAtivoId: planoAtivo.id,
      planoJaAlinhado: false,
      reavaliacao,
    };
  });
}

export async function incorporarReavaliacaoSePropostaEstrutural(
  userId: string,
  reavaliacaoId: string,
  reviewId: string,
  proposta: { tipo: string; gatilho?: string },
): Promise<boolean> {
  if (proposta.tipo !== "estrutural" || proposta.gatilho !== "mudanca_objetivo") {
    return false;
  }
  await incorporarReavaliacaoNaRevisao(userId, reavaliacaoId, reviewId);
  return true;
}

export async function incorporarReavaliacaoNaRevisao(
  userId: string,
  reavaliacaoId: string,
  reviewId: string,
) {
  const [linha] = await db
    .update(planReassessments)
    .set({ estado: "incorporada", reviewId })
    .where(
      and(
        eq(planReassessments.id, reavaliacaoId),
        eq(planReassessments.userId, userId),
        eq(planReassessments.estado, "pendente"),
      ),
    )
    .returning();
  if (!linha) throw new Error("Reavaliação pendente não encontrada.");
  return linha;
}

export async function rejeitarReavaliacaoDaRevisao(
  userId: string,
  reviewId: string,
) {
  const [linha] = await db
    .update(planReassessments)
    .set({ estado: "rejeitada", resolvedAt: new Date() })
    .where(
      and(
        eq(planReassessments.userId, userId),
        eq(planReassessments.reviewId, reviewId),
        eq(planReassessments.estado, "incorporada"),
      ),
    )
    .returning();
  return linha ?? null;
}

export async function obterReavaliacaoDaRevisao(
  userId: string,
  reviewId: string,
) {
  const [linha] = await db
    .select()
    .from(planReassessments)
    .where(
      and(
        eq(planReassessments.userId, userId),
        eq(planReassessments.reviewId, reviewId),
      ),
    )
    .limit(1);
  return linha ?? null;
}

export async function obterReavaliacaoEmAnalise(userId: string) {
  const [linha] = await db
    .select()
    .from(planReassessments)
    .where(
      and(
        eq(planReassessments.userId, userId),
        eq(planReassessments.estado, "incorporada"),
      ),
    )
    .orderBy(desc(planReassessments.createdAt))
    .limit(1);
  return linha ?? null;
}

export async function obterReavaliacaoPendente(userId: string) {
  const [linha] = await db
    .select()
    .from(planReassessments)
    .where(
      and(
        eq(planReassessments.userId, userId),
        eq(planReassessments.estado, "pendente"),
      ),
    )
    .orderBy(desc(planReassessments.createdAt))
    .limit(1);
  return linha ?? null;
}
