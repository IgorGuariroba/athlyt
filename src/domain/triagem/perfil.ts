import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profileVersions } from "@/db/schema";
import type { RespostasTriagem } from "./etapas";

export interface PerfilVigente {
  version: number;
  respostas: RespostasTriagem;
  createdAt: Date;
}

/**
 * Versão mais recente do perfil de triagem do usuário, ou `null` se
 * nenhuma resposta foi dada ainda (specs/mvp-vertical.md, user story
 * 17 — perfil versionado).
 */
export async function obterPerfilVigente(
  userId: string,
): Promise<PerfilVigente | null> {
  const [linha] = await db
    .select()
    .from(profileVersions)
    .where(eq(profileVersions.userId, userId))
    .orderBy(desc(profileVersions.version))
    .limit(1);

  if (!linha) return null;

  return {
    version: linha.version,
    respostas: linha.respostas as RespostasTriagem,
    createdAt: linha.createdAt,
  };
}

/**
 * Registra novas respostas como uma versão nova do perfil, fazendo
 * merge sobre o snapshot vigente — nunca sobrescreve a linha
 * anterior, apenas insere a próxima (specs/mvp-vertical.md, user
 * story 17: "corrigir e versionar informações do perfil ... sem
 * apagar o histórico").
 */
export async function registrarRespostas(
  userId: string,
  novasRespostas: Partial<RespostasTriagem>,
): Promise<PerfilVigente> {
  return db.transaction(async (tx) => {
    const [linhaAtual] = await tx
      .select()
      .from(profileVersions)
      .where(eq(profileVersions.userId, userId))
      .orderBy(desc(profileVersions.version))
      .limit(1)
      .for("update");

    const respostasAnteriores = (linhaAtual?.respostas ??
      {}) as RespostasTriagem;
    const proximaVersao = (linhaAtual?.version ?? 0) + 1;
    const respostasMescladas: RespostasTriagem = {
      ...respostasAnteriores,
      ...novasRespostas,
    };

    const [inserida] = await tx
      .insert(profileVersions)
      .values({
        userId,
        version: proximaVersao,
        respostas: respostasMescladas,
      })
      .returning();

    return {
      version: inserida.version,
      respostas: inserida.respostas as RespostasTriagem,
      createdAt: inserida.createdAt,
    };
  });
}

/**
 * Histórico completo de versões, mais recente primeiro — base da
 * consulta de histórico exigida pela user story 17.
 */
export async function listarHistoricoPerfil(
  userId: string,
): Promise<PerfilVigente[]> {
  const linhas = await db
    .select()
    .from(profileVersions)
    .where(eq(profileVersions.userId, userId))
    .orderBy(desc(profileVersions.version));

  return linhas.map((linha) => ({
    version: linha.version,
    respostas: linha.respostas as RespostasTriagem,
    createdAt: linha.createdAt,
  }));
}

