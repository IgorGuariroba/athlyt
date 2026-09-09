import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { and, eq, inArray, isNull, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { progressPhotos } from "@/db/schema";
import { criarStorageR2, type StoragePrivado } from "@/infra/storage";

export const LIMITE_FOTO_CORPORAL_BYTES = 10 * 1024 * 1024;
export const TIPOS_FOTO_CORPORAL = new Set(["image/jpeg", "image/png", "image/webp"]);
export type PoseCorporal = "frente" | "costas" | "lateral_direita" | "lateral_esquerda";

type LinhaFoto = typeof progressPhotos.$inferSelect;
export interface FotoCorporal {
  id: string;
  assessmentId: string | null;
  userId: string;
  pose: PoseCorporal;
  condicoes: string | null;
  protocoloVersao: string;
  excluirEm: Date | null;
  observadoEm: Date;
  createdAt: Date;
  url: string | null;
  exclusaoPendente: boolean;
}

export async function prepararFotoCorporal(entrada: { bytes: Uint8Array; contentType: string }) {
  if (!TIPOS_FOTO_CORPORAL.has(entrada.contentType)) throw new Error("Formato de foto não permitido.");
  if (entrada.bytes.byteLength > LIMITE_FOTO_CORPORAL_BYTES) throw new Error("Foto excede o limite de 10 MB.");
  const corpo = await sharp(entrada.bytes).rotate().resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  return { corpo, contentType: "image/webp" as const };
}

function mapear(linha: LinhaFoto, url: string | null): FotoCorporal {
  return { id: linha.id, assessmentId: linha.assessmentId, userId: linha.userId, pose: linha.pose, condicoes: linha.condicoes, protocoloVersao: linha.protocoloVersao, excluirEm: linha.excluirEm, observadoEm: linha.observadoEm, createdAt: linha.createdAt, url, exclusaoPendente: linha.exclusaoPendenteEm !== null };
}

function storagePadrao(storage?: StoragePrivado) { return storage ?? criarStorageR2(); }

export async function registrarFotoCorporal(
  userId: string,
  entrada: { assessmentId?: string; pose: PoseCorporal; bytes: Uint8Array; contentType: string; condicoes?: string; excluirEm?: Date },
  storage?: StoragePrivado,
): Promise<FotoCorporal> {
  const preparada = await prepararFotoCorporal({ bytes: entrada.bytes, contentType: entrada.contentType });
  const chave = `usuarios/${userId}/progresso/${randomUUID()}.webp`;
  const privado = storagePadrao(storage);
  await privado.gravar({ chave, ...preparada });
  try {
    const [linha] = await db.insert(progressPhotos).values({ userId, assessmentId: entrada.assessmentId, pose: entrada.pose, objectKey: chave, condicoes: entrada.condicoes, excluirEm: entrada.excluirEm }).returning();
    if (!linha) throw new Error("Falha ao registrar foto: linha não retornada.");
    return mapear(linha, null);
  } catch (erro) {
    await Promise.allSettled([privado.excluir(chave)]);
    throw erro;
  }
}

async function buscarLinhas(userId: string, ids?: readonly string[], incluirPendentes = false) {
  const filtros = [eq(progressPhotos.userId, userId)];
  if (ids) filtros.push(inArray(progressPhotos.id, ids));
  if (!incluirPendentes) filtros.push(isNull(progressPhotos.exclusaoPendenteEm));
  return db.select().from(progressPhotos).where(and(...filtros));
}

export async function listarFotosCorporais(userId: string, storage?: StoragePrivado, incluirPendentes = false): Promise<FotoCorporal[]> {
  const linhas = await buscarLinhas(userId, undefined, incluirPendentes);
  if (!linhas.length) return [];
  const privadas = storagePadrao(storage);
  return Promise.all(linhas.map(async (linha) => mapear(linha, linha.exclusaoPendenteEm === null ? await privadas.urlLeitura(linha.objectKey, 600) : null)));
}

export async function lerFotosCorporais(userId: string, ids: readonly string[], storage?: StoragePrivado) {
  const linhas = await buscarLinhas(userId, ids);
  if (linhas.length !== new Set(ids).size) return null;
  const privado = storagePadrao(storage);
  return Promise.all(linhas.map(async (linha) => {
    const arquivo = await privado.ler(linha.objectKey);
    return { ...mapear(linha, null), dados: arquivo.corpo, mediaType: arquivo.contentType };
  }));
}

export interface ResultadoExclusaoFoto { concluidas: string[]; pendentes: string[]; falhas: string[] }

export async function excluirFotosCorporais(userId: string, ids: readonly string[], storage?: StoragePrivado): Promise<ResultadoExclusaoFoto> {
  const resultado: ResultadoExclusaoFoto = { concluidas: [], pendentes: [], falhas: [] };
  if (!ids.length) return resultado;
  const privado = storagePadrao(storage);
  const linhas = await buscarLinhas(userId, ids, true);
  for (const linha of linhas) {
    if (linha.exclusaoPendenteEm === null) {
      try { await db.update(progressPhotos).set({ exclusaoPendenteEm: new Date() }).where(and(eq(progressPhotos.id, linha.id), eq(progressPhotos.userId, userId))); }
      catch { resultado.falhas.push(linha.id); continue; }
    }
    try { await privado.excluir(linha.objectKey); }
    catch { resultado.pendentes.push(linha.id); continue; }
    try { await db.delete(progressPhotos).where(and(eq(progressPhotos.id, linha.id), eq(progressPhotos.userId, userId))); resultado.concluidas.push(linha.id); }
    catch { resultado.pendentes.push(linha.id); }
  }
  return resultado;
}

export async function excluirFotoCorporal(userId: string, id: string, storage?: StoragePrivado) {
  return excluirFotosCorporais(userId, [id], storage);
}

export async function excluirTodasFotosCorporais(userId: string, storage?: StoragePrivado) {
  const linhas = await buscarLinhas(userId, undefined, true);
  return excluirFotosCorporais(userId, linhas.map((linha) => linha.id), storage);
}

export async function aplicarRetencaoFotos(agora = new Date(), storage?: StoragePrivado) {
  const linhas = await db.select().from(progressPhotos).where(or(isNotNull(progressPhotos.exclusaoPendenteEm), lt(progressPhotos.excluirEm, agora)));
  const agrupadas = new Map<string, string[]>();
  for (const linha of linhas) if (linha.exclusaoPendenteEm !== null || (linha.excluirEm !== null && linha.excluirEm < agora)) agrupadas.set(linha.userId, [...(agrupadas.get(linha.userId) ?? []), linha.id]);
  const resultado: ResultadoExclusaoFoto = { concluidas: [], pendentes: [], falhas: [] };
  for (const [userId, ids] of agrupadas) { const parcial = await excluirFotosCorporais(userId, ids, storage); resultado.concluidas.push(...parcial.concluidas); resultado.pendentes.push(...parcial.pendentes); resultado.falhas.push(...parcial.falhas); }
  return resultado;
}
