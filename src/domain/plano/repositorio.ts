import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, plans } from "@/db/schema";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { gerarPlano, substituirExercicio } from "./gerador";
import type { PlanoGerado } from "./tipos";

export interface PlanoPersistido {
  id: string;
  versao: number | null;
  estado: "rascunho" | "ativo" | "arquivado";
  conteudo: PlanoGerado;
  createdAt: Date;
  activatedAt: Date | null;
}

function mapear(linha: typeof plans.$inferSelect): PlanoPersistido {
  return { id: linha.id, versao: linha.versao, estado: linha.estado, conteudo: linha.conteudo as PlanoGerado, createdAt: linha.createdAt, activatedAt: linha.activatedAt };
}

async function trilhaDeterministica(entrada: { userId: string; perfilVersao: number; operacao: "plano-inicial"; resultado: unknown; campos: string[] }) {
  await db.insert(decisionTrails).values({
    userId: entrada.userId, operacao: entrada.operacao, recorteVersao: 1,
    perfilVersao: entrada.perfilVersao, modeloSolicitado: "motor-adaptativo",
    modeloResolvido: "motor-plano-v1", auditavel: true, degradado: false,
    camposEnviados: entrada.campos, camposOmitidos: [], ferramentasConsultadas: [],
    resultado: entrada.resultado,
  });
}

/** Reusa o rascunho do perfil vigente; gerar duas vezes não duplica plano. */
export async function obterOuGerarRascunho(userId: string, perfil: { version: number; respostas: RespostasTriagem }): Promise<PlanoPersistido> {
  const [existente] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "rascunho"), eq(plans.perfilVersao, perfil.version))).orderBy(desc(plans.createdAt)).limit(1);
  if (existente) return mapear(existente);
  const conteudo = gerarPlano({ perfilVersao: perfil.version, respostas: perfil.respostas });
  const [inserido] = await db.insert(plans).values({ userId, perfilVersao: perfil.version, estado: "rascunho", regraVersao: conteudo.regraVersao, modoConservador: conteudo.modoConservador, conteudo }).returning();
  await trilhaDeterministica({ userId, perfilVersao: perfil.version, operacao: "plano-inicial", resultado: { tipo: "plano-gerado", planoId: inserido.id, regraVersao: conteudo.regraVersao, modoConservador: conteudo.modoConservador }, campos: conteudo.dadosUsados });
  return mapear(inserido);
}

export async function obterRascunho(userId: string): Promise<PlanoPersistido | null> {
  const [linha] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "rascunho"))).orderBy(desc(plans.createdAt)).limit(1);
  return linha ? mapear(linha) : null;
}

export async function substituirNoRascunho(userId: string, entrada: { planoId: string; diaId: string; exercicioId: string; novoExercicioId: string }, respostas: RespostasTriagem): Promise<PlanoPersistido> {
  return db.transaction(async (tx) => {
    const [linha] = await tx.select().from(plans).where(and(eq(plans.id, entrada.planoId), eq(plans.userId, userId))).limit(1).for("update");
    if (!linha || linha.estado !== "rascunho") throw new Error("Somente um rascunho pode ser alterado.");
    const conteudo = substituirExercicio(linha.conteudo as PlanoGerado, entrada, respostas);
    const [atualizado] = await tx.update(plans).set({ conteudo }).where(eq(plans.id, linha.id)).returning();
    await tx.insert(decisionTrails).values({ userId, operacao: "plano-inicial", recorteVersao: 1, perfilVersao: linha.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "motor-plano-v1", auditavel: true, degradado: false, camposEnviados: ["equipamentos", "lesoes", "experienciaTreino"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "substituicao-pre-ativacao", planoId: linha.id, diaId: entrada.diaId, de: entrada.exercicioId, para: entrada.novoExercicioId } });
    return mapear(atualizado);
  });
}

/** Ativação arquiva o anterior e congela o rascunho como próxima versão. */
export async function ativarPlano(userId: string, planoId: string): Promise<PlanoPersistido> {
  return db.transaction(async (tx) => {
    const [rascunho] = await tx.select().from(plans).where(and(eq(plans.id, planoId), eq(plans.userId, userId))).limit(1).for("update");
    if (!rascunho || rascunho.estado !== "rascunho") throw new Error("Plano já ativado ou inexistente.");
    const [ultimo] = await tx.select({ versao: plans.versao }).from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).orderBy(desc(plans.versao)).limit(1).for("update");
    await tx.update(plans).set({ estado: "arquivado" }).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo")));
    const [ativo] = await tx.update(plans).set({ estado: "ativo", versao: (ultimo?.versao ?? 0) + 1, activatedAt: new Date() }).where(eq(plans.id, planoId)).returning();
    return mapear(ativo);
  });
}

export async function obterPlanoAtivo(userId: string): Promise<PlanoPersistido | null> {
  const [linha] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1);
  return linha ? mapear(linha) : null;
}
