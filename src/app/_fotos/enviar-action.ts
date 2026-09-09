"use server";

import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { LIMITE_FOTO_CORPORAL_BYTES, registrarFotoCorporal, TIPOS_FOTO_CORPORAL } from "@/domain/medicoes/fotos";
import { obterOuCriarAvaliacaoInicial } from "@/domain/medicoes/repositorio";
import { campoNumero, campoTexto, campoTextoOpcional } from "@/lib/form-data";

const POSES_VALIDAS = ["frente", "costas", "lateral_direita", "lateral_esquerda"] as const;
type PoseCorporal = (typeof POSES_VALIDAS)[number];
const ehPose = (valor: string): valor is PoseCorporal => (POSES_VALIDAS as readonly string[]).includes(valor);

/** Uma pose por requisição preserva o limite de corpo das Server Actions. */
export async function enviarFotoCorporal(fd: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (fd.get("consentimentoArmazenamento") !== "sim") return { ok: false, erro: "Confirme o armazenamento privado para enviar as fotos." };
  const pose = campoTexto(fd, "pose");
  if (!ehPose(pose)) return { ok: false, erro: "Pose inválida." };
  const arquivo = fd.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Selecione ao menos uma foto." };
  if (!TIPOS_FOTO_CORPORAL.has(arquivo.type) || arquivo.size > LIMITE_FOTO_CORPORAL_BYTES) return { ok: false, erro: "Use JPG, PNG ou WebP com até 10 MB por foto." };

  const userId = session.user.id;
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  await db.insert(consents).values({ userId, operacao: "foto-corporal-armazenamento", campo: "foto-corporal", recorteVersao: 1, provedor: "Cloudflare R2" }).onConflictDoNothing({ target: [consents.userId, consents.operacao, consents.campo, consents.recorteVersao], where: sql`${consents.revogadoEm} IS NULL` });
  const retencaoDias = campoNumero(fd, "retencaoDias", 0);
  const excluirEm = Number.isFinite(retencaoDias) && retencaoDias > 0 ? new Date(Date.now() + Math.min(retencaoDias, 3650) * 86_400_000) : undefined;
  try {
    await registrarFotoCorporal(userId, { assessmentId: avaliacao.id, pose, bytes: new Uint8Array(await arquivo.arrayBuffer()), contentType: arquivo.type, condicoes: campoTextoOpcional(fd, "condicoes") ?? undefined, excluirEm });
  } catch {
    return { ok: false, erro: "Não foi possível registrar esta foto. Tente novamente." };
  }
  invalidarLeituras([{ fato: "medicoes" }, { fato: "consentimento" }]);
  return { ok: true };
}
