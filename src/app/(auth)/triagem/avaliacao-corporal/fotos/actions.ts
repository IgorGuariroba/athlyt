"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { excluirFotoCorporal as excluirFotoNoDominio, excluirTodasFotosCorporais as excluirTodasNoDominio } from "@/domain/medicoes/fotos";
import { campoTexto } from "@/lib/form-data";

export async function excluirFotoCorporal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const fotoId = campoTexto(fd, "fotoId");
  const resultado = await excluirFotoNoDominio(session.user.id, fotoId);
  if (!resultado.concluidas.length && !resultado.pendentes.length && !resultado.falhas.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Foto não encontrada.");
  if (resultado.pendentes.length || resultado.falhas.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Exclusão pendente; tente novamente.");
  const destino = "/triagem/avaliacao-corporal/fotos?sucesso=Foto excluída do storage privado.";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}

export async function excluirTodasFotosCorporais() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const resultado = await excluirTodasNoDominio(session.user.id);
  if (resultado.pendentes.length || resultado.falhas.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Algumas fotos ficaram pendentes; tente novamente.");
  await db.update(consents).set({ revogadoEm: new Date() }).where(and(eq(consents.userId, session.user.id), eq(consents.operacao, "foto-corporal-armazenamento"), isNull(consents.revogadoEm)));
  const destino = "/triagem/avaliacao-corporal/fotos?sucesso=Todas as fotos foram excluídas do storage privado.";
  invalidarLeituras([{ fato: "medicoes" }, { fato: "consentimento" }], { destino });
  redirect(destino);
}
