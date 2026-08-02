"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { LIMITE_FOTO_CORPORAL_BYTES, prepararFotoCorporal, TIPOS_FOTO_CORPORAL } from "@/domain/medicoes/fotos";
import { excluirFotoProgresso, excluirFotosProgresso, obterOuCriarAvaliacaoInicial, obterPanoramaCorporal, registrarFotoProgresso } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";

export async function excluirFotoCorporal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const fotoId = String(fd.get("fotoId") ?? "");
  const panorama = await obterPanoramaCorporal(session.user.id);
  const foto = panorama.fotos.find((item) => item.id === fotoId);
  if (!foto) redirect("/triagem/avaliacao-corporal/fotos?erro=Foto não encontrada.");
  await criarStorageR2().excluir(foto.objectKey);
  await excluirFotoProgresso(session.user.id, foto.id);
  revalidatePath("/triagem/avaliacao-corporal/fotos"); revalidatePath("/progresso"); revalidatePath("/inicio");
  redirect("/triagem/avaliacao-corporal/fotos?sucesso=Foto excluída do storage privado.");
}

export async function excluirTodasFotosCorporais() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const panorama = await obterPanoramaCorporal(session.user.id); const storage = criarStorageR2();
  const exclusoes = await Promise.allSettled(panorama.fotos.map((foto) => storage.excluir(foto.objectKey)));
  if (exclusoes.some((resultado) => resultado.status === "rejected")) redirect("/triagem/avaliacao-corporal/fotos?erro=Algumas fotos não puderam ser excluídas; os registros foram preservados para nova tentativa.");
  await excluirFotosProgresso(session.user.id, panorama.fotos.map((foto) => foto.id));
  await db.update(consents).set({ revogadoEm: new Date() }).where(and(eq(consents.userId, session.user.id), eq(consents.operacao, "foto-corporal-armazenamento"), isNull(consents.revogadoEm)));
  revalidatePath("/triagem/avaliacao-corporal/fotos"); revalidatePath("/progresso");
  redirect("/triagem/avaliacao-corporal/fotos?sucesso=Todas as fotos foram excluídas do storage privado.");
}

export async function enviarFotosCorporais(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (fd.get("consentimentoArmazenamento") !== "sim") redirect("/triagem/avaliacao-corporal/fotos?erro=Confirme o armazenamento privado para enviar as fotos.");

  const userId = session.user.id;
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  const storage = criarStorageR2();
  const entradas = [
    ["frente", fd.get("frente")], ["costas", fd.get("costas")],
    ["lateral_direita", fd.get("lateralDireita")], ["lateral_esquerda", fd.get("lateralEsquerda")],
  ] as const;
  const arquivos = entradas.filter((entrada): entrada is readonly [typeof entrada[0], File] => entrada[1] instanceof File && entrada[1].size > 0);
  if (!arquivos.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Selecione ao menos uma foto.");

  for (const [, arquivo] of arquivos) {
    if (!TIPOS_FOTO_CORPORAL.has(arquivo.type) || arquivo.size > LIMITE_FOTO_CORPORAL_BYTES) redirect("/triagem/avaliacao-corporal/fotos?erro=Use JPG, PNG ou WebP com até 10 MB por foto.");
  }

  await db.insert(consents).values({ userId, operacao: "foto-corporal-armazenamento", campo: "foto-corporal", recorteVersao: 1, provedor: "Cloudflare R2" });
  const retencaoDias = Number(fd.get("retencaoDias") ?? 0);
  const excluirEm = Number.isFinite(retencaoDias) && retencaoDias > 0 ? new Date(Date.now() + Math.min(retencaoDias, 3650) * 86_400_000) : undefined;
  const gravadas: string[] = [];
  const registros: string[] = [];
  try {
    for (const [pose, arquivo] of arquivos) {
      const preparada = await prepararFotoCorporal({ bytes: new Uint8Array(await arquivo.arrayBuffer()), contentType: arquivo.type });
      const chave = `usuarios/${userId}/progresso/${randomUUID()}.webp`;
      await storage.gravar({ chave, ...preparada });
      gravadas.push(chave);
      const registro = await registrarFotoProgresso(userId, { assessmentId: avaliacao.id, pose, objectKey: chave, condicoes: String(fd.get("condicoes") ?? "") || undefined, excluirEm });
      registros.push(registro.id);
    }
  } catch (erro) {
    await Promise.allSettled(gravadas.map((chave) => storage.excluir(chave)));
    await excluirFotosProgresso(userId, registros);
    throw erro;
  }
  revalidatePath("/progresso"); revalidatePath("/inicio");
  redirect("/triagem/avaliacao-corporal/fotos?sucesso=Fotos armazenadas de forma privada.");
}
