"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { revogar } from "@/domain/ia/consentimento";
import { excluirFotosProgresso, obterPanoramaCorporal, revogarAvaliacoesVisuais } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";

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
  const panorama = await obterPanoramaCorporal(session.user.id); const storage = criarStorageR2();
  const resultados = await Promise.allSettled(panorama.fotos.map((foto) => storage.excluir(foto.objectKey)));
  if (resultados.some((item) => item.status === "rejected")) redirect("/mais/consentimentos?erro=Não foi possível excluir todos os objetos; o consentimento permanece ativo para preservar a reconciliação.");
  await excluirFotosProgresso(session.user.id, panorama.fotos.map((foto) => foto.id));
  await db.update(consents).set({ revogadoEm: new Date() }).where(and(eq(consents.userId, session.user.id), eq(consents.operacao, "foto-corporal-armazenamento"), isNull(consents.revogadoEm)));
  const destino = "/mais/consentimentos?sucesso=Consentimento de armazenamento revogado e fotos excluídas.";
  invalidarLeituras([{ fato: "consentimento" }, { fato: "medicoes" }], { destino });
  redirect(destino);
}
