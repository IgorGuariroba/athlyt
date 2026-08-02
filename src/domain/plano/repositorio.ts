import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, planExperiments, plans } from "@/db/schema";
import { avaliarConfiancaCorporal, gerarMetasProporcao } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
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
    userId: entrada.userId, operacao: entrada.operacao, recorteVersao: 2,
    perfilVersao: entrada.perfilVersao, modeloSolicitado: "motor-adaptativo",
    modeloResolvido: "motor-plano-v2", auditavel: true, degradado: false,
    camposEnviados: entrada.campos, camposOmitidos: [], ferramentasConsultadas: [],
    resultado: entrada.resultado,
  });
}

/** Reusa o rascunho do perfil vigente; gerar duas vezes não duplica plano. */
export async function obterOuGerarRascunho(userId: string, perfil: { version: number; respostas: RespostasTriagem }): Promise<PlanoPersistido> {
  const [existente] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "rascunho"), eq(plans.perfilVersao, perfil.version))).orderBy(desc(plans.createdAt)).limit(1);
  if (existente) return mapear(existente);
  const panorama = await obterPanoramaCorporal(userId);
  const regioes = new Set(panorama.medicoes.flatMap((m) => [m.regiao, `${m.regiao}:${m.lado}`]));
  const respostas = perfil.respostas;
  const confiancaCorporal = avaliarConfiancaCorporal({
    regioes,
    possuiGordura: panorama.gorduras.length > 0,
    possuiFotos: panorama.fotos.length > 0,
    triagemTreinoCompleta: Boolean(respostas.experienciaTreino && respostas.diasDisponiveis?.length && respostas.equipamentos),
    triagemNutricaoCompleta: Boolean(respostas.pesoKg && respostas.alturaCm && respostas.objetivoComposicao),
    saudeInformada: respostas.lesoes !== undefined && respostas.condicoes !== undefined,
  });
  const metasProporcao = panorama.metas.length
    ? panorama.metas.map((meta) => ({ ...meta, regiao: meta.regiao as import("@/domain/medicoes").RegiaoCorporal }))
    : gerarMetasProporcao(panorama.medicoes);
  const conteudo = gerarPlano({ perfilVersao: perfil.version, respostas, confiancaCorporal, metasProporcao });
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
    await tx.insert(decisionTrails).values({ userId, operacao: "plano-inicial", recorteVersao: 2, perfilVersao: linha.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "motor-plano-v2", auditavel: true, degradado: false, camposEnviados: ["equipamentos", "lesoes", "experienciaTreino"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "substituicao-pre-ativacao", planoId: linha.id, diaId: entrada.diaId, de: entrada.exercicioId, para: entrada.novoExercicioId } });
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

export async function ativarExperimentoPlano(userId: string, entrada: { planoId: string; hipotese: string; variaveis: string[]; criterioSucesso: string; criterioInterrupcao: string; janelaMinimaSemanas: number }) {
  if (!entrada.hipotese.trim() || !entrada.criterioSucesso.trim() || !entrada.criterioInterrupcao.trim() || entrada.variaveis.length === 0) throw new Error("Experimento incompleto.");
  return db.transaction(async (tx) => {
    const [baseline] = await tx.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1).for("update");
    const [rascunho] = await tx.select().from(plans).where(and(eq(plans.id, entrada.planoId), eq(plans.userId, userId), eq(plans.estado, "rascunho"))).limit(1).for("update");
    const [existente] = await tx.select().from(planExperiments).where(and(eq(planExperiments.userId, userId), eq(planExperiments.estado, "ativo"))).limit(1).for("update");
    if (!baseline || !rascunho) throw new Error("Plano Estável ou rascunho não encontrado.");
    if (existente) throw new Error("Já existe um Experimento de Plano ativo.");
    await tx.update(plans).set({ estado: "arquivado" }).where(eq(plans.id, baseline.id));
    const [ativo] = await tx.update(plans).set({ estado: "ativo", versao: (baseline.versao ?? 0) + 1, activatedAt: new Date() }).where(eq(plans.id, rascunho.id)).returning();
    const [linha] = await tx.insert(planExperiments).values({ userId, baselinePlanId: baseline.id, experimentPlanId: ativo.id, hipotese: entrada.hipotese, variaveis: entrada.variaveis, criterioSucesso: entrada.criterioSucesso, criterioInterrupcao: entrada.criterioInterrupcao, janelaMinimaSemanas: Math.max(1, Math.min(8, entrada.janelaMinimaSemanas)) }).returning();
    return linha;
  });
}

export async function obterExperimentoAtivo(userId: string) {
  const [linha] = await db.select().from(planExperiments).where(and(eq(planExperiments.userId, userId), eq(planExperiments.estado, "ativo"))).orderBy(desc(planExperiments.startedAt)).limit(1);
  return linha ?? null;
}

export async function reverterAoPlanoEstavel(userId: string, experimentId: string) {
  return db.transaction(async (tx) => {
    const [experimento] = await tx.select().from(planExperiments).where(and(eq(planExperiments.id, experimentId), eq(planExperiments.userId, userId), eq(planExperiments.estado, "ativo"))).limit(1).for("update");
    if (!experimento) throw new Error("Experimento ativo não encontrado.");
    const [baseline] = await tx.select().from(plans).where(and(eq(plans.id, experimento.baselinePlanId), eq(plans.userId, userId))).limit(1);
    const [atual] = await tx.select({ versao: plans.versao }).from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).orderBy(desc(plans.versao)).limit(1).for("update");
    if (!baseline) throw new Error("Plano Estável não encontrado.");
    await tx.update(plans).set({ estado: "arquivado" }).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo")));
    const [rollback] = await tx.insert(plans).values({ userId, perfilVersao: baseline.perfilVersao, versao: (atual?.versao ?? 0) + 1, estado: "ativo", regraVersao: baseline.regraVersao, modoConservador: baseline.modoConservador, conteudo: baseline.conteudo, activatedAt: new Date() }).returning();
    await tx.update(planExperiments).set({ estado: "revertido", rollbackPlanId: rollback.id, endedAt: new Date() }).where(eq(planExperiments.id, experimento.id));
    await tx.insert(decisionTrails).values({ userId, operacao: "revisao-semanal", recorteVersao: 2, perfilVersao: baseline.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "rollback-plano-v1", auditavel: true, degradado: false, camposEnviados: ["experimento", "plano-estavel"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "rollback", experimentId, de: experimento.experimentPlanId, para: rollback.id, baselinePlanId: baseline.id } });
    return mapear(rollback);
  });
}
