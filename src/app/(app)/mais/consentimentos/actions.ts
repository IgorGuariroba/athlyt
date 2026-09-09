"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { revogar } from "@/domain/ia/consentimento";
import { excluirTodasFotosCorporais } from "@/domain/medicoes/fotos";
import { revogarAvaliacoesVisuais } from "@/domain/medicoes/repositorio";

const CAMPOS_VISUAIS = ["fotos-corporais", "medicoes-comparaveis", "condicoes-captura"];
export async function revogarIAVisual() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  await Promise.all(CAMPOS_VISUAIS.map((campo) => revogar(userId, "avaliacao-visual", campo)));
  await revogarAvaliacoesVisuais(userId);
  const destino = "/mais/consentimentos?sucesso=Consentimento de análise visual revogado.";
  invalidarLeituras([{ fato: "consentimento" }], { destino });
  redirect(destino);
}

export async function revogarStorageFotos() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const resultado = await excluirTodasFotosCorporais(session.user.id);
  if (resultado.pendentes.length || resultado.falhas.length) redirect("/mais/consentimentos?erro=Algumas fotos ficaram pendentes; tente novamente.");
  await db.update(consents).set({ revogadoEm: new Date() }).where(and(eq(consents.userId, session.user.id), eq(consents.operacao, "foto-corporal-armazenamento"), isNull(consents.revogadoEm)));
  const destino = "/mais/consentimentos?sucesso=Consentimento de armazenamento revogado e fotos excluídas.";
  invalidarLeituras([{ fato: "consentimento" }, { fato: "medicoes" }], { destino });
  redirect(destino);
}
