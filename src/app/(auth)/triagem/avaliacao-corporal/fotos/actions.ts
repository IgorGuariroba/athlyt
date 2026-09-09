"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { excluirFotoCorporal as excluirFotoNoDominio, excluirFotosCorporais, LIMITE_FOTO_CORPORAL_BYTES, registrarFotoCorporal, TIPOS_FOTO_CORPORAL } from "@/domain/medicoes/fotos";
import { obterOuCriarAvaliacaoInicial, obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { campoNumero, campoTexto, campoTextoOpcional } from "@/lib/form-data";

const POSES_VALIDAS = ["frente", "costas", "lateral_direita", "lateral_esquerda"] as const;
type PoseCorporal = (typeof POSES_VALIDAS)[number];
const ehPose = (valor: string): valor is PoseCorporal =>
  (POSES_VALIDAS as readonly string[]).includes(valor);

export async function excluirFotoCorporal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const fotoId = campoTexto(fd, "fotoId");
  const panorama = await obterPanoramaCorporal(session.user.id);
  const foto = panorama.fotos.find((item) => item.id === fotoId);
  if (!foto) redirect("/triagem/avaliacao-corporal/fotos?erro=Foto não encontrada.");
  const resultado = await excluirFotoNoDominio(session.user.id, foto.id);
  if (resultado.pendentes.length || resultado.falhas.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Exclusão pendente; tente novamente.");
  const destino = "/triagem/avaliacao-corporal/fotos?sucesso=Foto excluída do storage privado.";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}

export async function excluirTodasFotosCorporais() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const panorama = await obterPanoramaCorporal(session.user.id);
  const resultado = await excluirFotosCorporais(session.user.id, panorama.fotos.map((foto) => foto.id));
  if (resultado.pendentes.length || resultado.falhas.length) redirect("/triagem/avaliacao-corporal/fotos?erro=Algumas fotos ficaram pendentes; tente novamente.");
  await db.update(consents).set({ revogadoEm: new Date() }).where(and(eq(consents.userId, session.user.id), eq(consents.operacao, "foto-corporal-armazenamento"), isNull(consents.revogadoEm)));
  const destino = "/triagem/avaliacao-corporal/fotos?sucesso=Todas as fotos foram excluídas do storage privado.";
  invalidarLeituras([{ fato: "medicoes" }, { fato: "consentimento" }], { destino });
  redirect(destino);
}

/**
 * Envio de UMA pose por requisição.
 *
 * O corpo de uma Server Action é limitado (`bodySizeLimit`) e quatro
 * fotos de celular estouravam o teto mesmo depois da redução no
 * cliente — a tela então pedia ao usuário que enviasse "em duas
 * etapas", empurrando o problema de transporte para dentro do fluxo.
 * Fatiar o envio por pose mantém cada corpo pequeno por construção: o
 * cliente dispara uma chamada por foto, em sequência, e o usuário
 * continua escolhendo as quatro de uma vez.
 *
 * Não redireciona: quem coordena a sequência é o cliente, que só
 * navega ao final. Erros voltam como valor para a pose específica.
 */
export async function enviarFotoCorporal(
  fd: FormData,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (fd.get("consentimentoArmazenamento") !== "sim")
    return { ok: false, erro: "Confirme o armazenamento privado para enviar as fotos." };

  const pose = campoTexto(fd, "pose");
  if (!ehPose(pose)) return { ok: false, erro: "Pose inválida." };

  const arquivo = fd.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { ok: false, erro: "Selecione ao menos uma foto." };
  if (!TIPOS_FOTO_CORPORAL.has(arquivo.type) || arquivo.size > LIMITE_FOTO_CORPORAL_BYTES)
    return { ok: false, erro: "Use JPG, PNG ou WebP com até 10 MB por foto." };

  const userId = session.user.id;
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);

  // O consentimento é do conjunto, não de cada arquivo: só a primeira
  // pose da sequência o registra, senão haveria quatro registros
  // idênticos para um único ato de consentir.
  if (fd.get("registrarConsentimento") === "sim") {
    await db.insert(consents).values({
      userId,
      operacao: "foto-corporal-armazenamento",
      campo: "foto-corporal",
      recorteVersao: 1,
      provedor: "Cloudflare R2",
    });
  }

  const retencaoDias = campoNumero(fd, "retencaoDias", 0);
  const excluirEm =
    Number.isFinite(retencaoDias) && retencaoDias > 0
      ? new Date(Date.now() + Math.min(retencaoDias, 3650) * 86_400_000)
      : undefined;

  try {
    await registrarFotoCorporal(userId, {
      assessmentId: avaliacao.id,
      pose,
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
      contentType: arquivo.type,
      condicoes: campoTextoOpcional(fd, "condicoes") ?? undefined,
      excluirEm,
    });
  } catch {
    return { ok: false, erro: "Não foi possível registrar esta foto. Tente novamente." };
  }

  invalidarLeituras([{ fato: "medicoes" }, { fato: "consentimento" }]);
  return { ok: true };
}
