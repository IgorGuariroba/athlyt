import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { bodyAssessments, bodyFatMeasurements, bodyMeasurements, bodyProportionGoals, bodyVisualAnalyses, decisionTrails, progressPhotos, weeklyBodyReviews, weightMeasurements } from "@/db/schema";
import { consolidarCircunferencia, gerarMetasProporcao, PROTOCOLO_CIRCUNFERENCIAS_VERSAO, type LadoCorporal, type MedicaoCorporal, type RegiaoCorporal } from "./index";
import type { CriteriosVisuais } from "./avaliacao-visual";
import type { produzirRevisaoCorporal } from "./revisao-corporal";

export async function obterOuCriarAvaliacaoInicial(userId: string) {
  const [existente] = await db.select().from(bodyAssessments).where(and(eq(bodyAssessments.userId, userId), eq(bodyAssessments.tipo, "inicial"))).orderBy(desc(bodyAssessments.createdAt)).limit(1);
  if (existente) return existente;
  const [criada] = await db.insert(bodyAssessments).values({ userId, tipo: "inicial" }).returning();
  return criada;
}

export async function registrarCircunferencia(userId: string, entrada: { regiao: RegiaoCorporal; lado?: LadoCorporal; leiturasCm: number[]; condicoes?: string; assessmentId?: string }) {
  const consolidada = consolidarCircunferencia(entrada.leiturasCm);
  if (!consolidada.ok) return consolidada;
  const [linha] = await db.insert(bodyMeasurements).values({
    userId,
    assessmentId: entrada.assessmentId,
    regiao: entrada.regiao,
    lado: entrada.lado ?? "unico",
    leiturasMm: consolidada.leiturasMm,
    valorMm: consolidada.valorMm,
    qualidade: consolidada.qualidade,
    protocoloVersao: PROTOCOLO_CIRCUNFERENCIAS_VERSAO,
    condicoes: entrada.condicoes,
  }).returning();
  return { ok: true as const, medicao: linha };
}

/**
 * Salva a versão corrente de uma região dentro da Avaliação Inicial.
 *
 * Diferente de `registrarCircunferencia`, que acrescenta um ponto ao
 * histórico, esta operação atualiza a linha já existente. Autosave,
 * correções e o submit final pertencem à mesma coleta e não podem virar
 * falsas evoluções corporais.
 */
export async function salvarCircunferenciaDaAvaliacaoInicial(
  userId: string,
  entrada: {
    assessmentId: string;
    regiao: RegiaoCorporal;
    lado?: LadoCorporal;
    leiturasCm: number[];
    condicoes?: string;
  },
) {
  const consolidada = consolidarCircunferencia(entrada.leiturasCm);
  if (!consolidada.ok) return consolidada;

  const lado = entrada.lado ?? "unico";
  const [existente] = await db
    .select({ id: bodyMeasurements.id })
    .from(bodyMeasurements)
    .where(
      and(
        eq(bodyMeasurements.userId, userId),
        eq(bodyMeasurements.assessmentId, entrada.assessmentId),
        eq(bodyMeasurements.regiao, entrada.regiao),
        eq(bodyMeasurements.lado, lado),
      ),
    )
    .orderBy(desc(bodyMeasurements.observadoEm))
    .limit(1);

  const valores = {
    leiturasMm: consolidada.leiturasMm,
    valorMm: consolidada.valorMm,
    qualidade: consolidada.qualidade,
    protocoloVersao: PROTOCOLO_CIRCUNFERENCIAS_VERSAO,
    condicoes: entrada.condicoes,
    observadoEm: new Date(),
  };

  if (existente) {
    const [linha] = await db
      .update(bodyMeasurements)
      .set(valores)
      .where(eq(bodyMeasurements.id, existente.id))
      .returning();
    return { ok: true as const, medicao: linha };
  }

  const [linha] = await db
    .insert(bodyMeasurements)
    .values({
      ...valores,
      userId,
      assessmentId: entrada.assessmentId,
      regiao: entrada.regiao,
      lado,
    })
    .returning();
  return { ok: true as const, medicao: linha };
}

export async function registrarPeso(userId: string, pesoKg: number) {
  if (!Number.isFinite(pesoKg) || pesoKg < 30 || pesoKg > 300) throw new Error("Peso inválido.");
  const [linha] = await db.insert(weightMeasurements).values({ userId, pesoGramas: Math.round(pesoKg * 1000) }).returning();
  return linha;
}

export async function obterGorduraDaAvaliacaoInicial(userId: string) {
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  const [medicao] = await db
    .select()
    .from(bodyFatMeasurements)
    .where(
      and(
        eq(bodyFatMeasurements.userId, userId),
        eq(bodyFatMeasurements.assessmentId, avaliacao.id),
      ),
    )
    .orderBy(desc(bodyFatMeasurements.observadoEm))
    .limit(1);
  return medicao;
}

export async function registrarGorduraCorporal(userId: string, entrada: { percentual: number; metodo: string; protocolo?: string; equipamento?: string; profissional?: string; assessmentId?: string }) {
  if (!Number.isFinite(entrada.percentual) || entrada.percentual < 2 || entrada.percentual > 70) throw new Error("Percentual de gordura inválido.");
  const [linha] = await db.insert(bodyFatMeasurements).values({
    userId,
    assessmentId: entrada.assessmentId,
    percentualBasisPoints: Math.round(entrada.percentual * 100),
    metodo: entrada.metodo,
    protocolo: entrada.protocolo,
    equipamento: entrada.equipamento,
    profissional: entrada.profissional,
    confianca: entrada.protocolo ? "alta" : "moderada",
  }).returning();
  return linha;
}

/**
 * Último valor medido por região+lado da Avaliação Corporal Inicial,
 * em centímetros, para repor os campos quando o usuário volta à etapa.
 *
 * A chave usa `regiao:lado` porque braço, coxa e panturrilha têm
 * registros distintos por lado; regiões únicas ficam como `regiao:unico`.
 * Cada nova medição é uma linha nova (o histórico é preservado), então
 * a leitura pega a mais recente e ignora as anteriores.
 */
export async function obterMedidasDaAvaliacaoInicial(userId: string) {
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  const linhas = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, userId), eq(bodyMeasurements.assessmentId, avaliacao.id)))
    .orderBy(desc(bodyMeasurements.observadoEm));

  const porRegiao = new Map<string, string>();
  for (const linha of linhas) {
    const chave = `${linha.regiao}:${linha.lado}`;
    if (porRegiao.has(chave)) continue;
    porRegiao.set(chave, (linha.valorMm / 10).toString());
  }
  return porRegiao;
}

export async function listarMedicoesCorporais(userId: string): Promise<MedicaoCorporal[]> {
  const linhas = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, userId)).orderBy(desc(bodyMeasurements.observadoEm));
  return linhas.map((linha) => ({
    regiao: linha.regiao as RegiaoCorporal,
    lado: linha.lado,
    leiturasMm: linha.leiturasMm,
    valorMm: linha.valorMm,
    qualidade: linha.qualidade,
    observadoEm: linha.observadoEm,
  }));
}

export async function registrarFotoProgresso(userId: string, entrada: { assessmentId?: string; pose: "frente" | "costas" | "lateral_direita" | "lateral_esquerda"; objectKey: string; condicoes?: string; excluirEm?: Date }) {
  const [linha] = await db.insert(progressPhotos).values({ userId, ...entrada }).returning();
  return linha;
}

export async function excluirFotoProgresso(userId: string, fotoId: string) {
  const [linha] = await db.delete(progressPhotos).where(and(eq(progressPhotos.id, fotoId), eq(progressPhotos.userId, userId))).returning();
  return linha ?? null;
}

export async function excluirFotosProgresso(userId: string, fotoIds: string[]) {
  if (!fotoIds.length) return [];
  return db.delete(progressPhotos).where(and(eq(progressPhotos.userId, userId), inArray(progressPhotos.id, fotoIds))).returning();
}

export async function listarFotosExpiradas(agora = new Date()) {
  return db.select().from(progressPhotos).where(lt(progressPhotos.excluirEm, agora));
}

export async function registrarAvaliacaoVisual(userId: string, entrada: { photoIds: string[]; criterios: CriteriosVisuais; gorduraMinBasisPoints: number; gorduraMaxBasisPoints: number; observacoes: string[]; limitacoes: string[]; confianca: "alta" | "moderada" | "baixa"; metodologiaVersao: string; modeloResolvido: string }) {
  return db.transaction(async (tx) => {
    await tx.update(bodyVisualAnalyses).set({ ativa: false }).where(and(eq(bodyVisualAnalyses.userId, userId), eq(bodyVisualAnalyses.ativa, true)));
    const [linha] = await tx.insert(bodyVisualAnalyses).values({ userId, ...entrada }).returning();
    return linha;
  });
}

export async function revogarAvaliacoesVisuais(userId: string) {
  return db.update(bodyVisualAnalyses).set({ ativa: false }).where(and(eq(bodyVisualAnalyses.userId, userId), eq(bodyVisualAnalyses.ativa, true))).returning();
}

export async function registrarRevisaoCorporal(userId: string, entrada: { periodoInicio: Date; periodoFim: Date; revisao: ReturnType<typeof produzirRevisaoCorporal>; perfilVersao?: number }) {
  return db.transaction(async (tx) => {
    const [linha] = await tx.insert(weeklyBodyReviews).values({ userId, periodoInicio: entrada.periodoInicio, periodoFim: entrada.periodoFim, scorecard: entrada.revisao.scorecard, confiancas: entrada.revisao.confiancas, evidencias: entrada.revisao.evidencias, proposta: entrada.revisao.proposta, metodologiaVersao: entrada.revisao.scorecard.metodologiaVersao }).returning();
    await tx.insert(decisionTrails).values({ userId, operacao: "revisao-semanal", recorteVersao: 2, perfilVersao: entrada.perfilVersao ?? 0, modeloSolicitado: "motor-adaptativo", modeloResolvido: "motor-scorecard-v1", auditavel: true, degradado: Object.values(entrada.revisao.confiancas).some((valor) => valor !== "confiavel"), camposEnviados: ["aderencia-semana", "desempenho-semana", "tendencia-corporal", "metas-proporcao", "conflitos-medicao", "recuperacao", "utilidade-recomendacoes"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { reviewId: linha.id, ...entrada.revisao } });
    return linha;
  });
}

export async function vincularAjusteAutomatico(userId: string, reviewId: string, entrada: { baselinePlanId: string; appliedPlanId: string }) {
  const [linha] = await db.update(weeklyBodyReviews).set({ estado: "aplicada", ...entrada }).where(and(eq(weeklyBodyReviews.id, reviewId), eq(weeklyBodyReviews.userId, userId))).returning();
  return linha ?? null;
}

export async function obterRevisaoCorporal(userId: string, reviewId: string) {
  const [linha] = await db.select().from(weeklyBodyReviews).where(and(eq(weeklyBodyReviews.id, reviewId), eq(weeklyBodyReviews.userId, userId))).limit(1);
  return linha ?? null;
}

export async function atualizarEstadoRevisaoCorporal(userId: string, reviewId: string, estado: "aplicada" | "rejeitada" | "desfeita", rollbackPlanId?: string) {
  const [linha] = await db.update(weeklyBodyReviews).set({ estado, rollbackPlanId }).where(and(eq(weeklyBodyReviews.id, reviewId), eq(weeklyBodyReviews.userId, userId))).returning();
  return linha ?? null;
}

export async function obterPanoramaCorporal(userId: string) {
  const [medicoes, pesos, gorduras, fotos, metas, avaliacoesVisuais, revisoes] = await Promise.all([
    listarMedicoesCorporais(userId),
    db.select().from(weightMeasurements).where(eq(weightMeasurements.userId, userId)).orderBy(desc(weightMeasurements.observadoEm)),
    db.select().from(bodyFatMeasurements).where(eq(bodyFatMeasurements.userId, userId)).orderBy(desc(bodyFatMeasurements.observadoEm)),
    db.select().from(progressPhotos).where(eq(progressPhotos.userId, userId)).orderBy(desc(progressPhotos.observadoEm)),
    db.select().from(bodyProportionGoals).where(and(eq(bodyProportionGoals.userId, userId), eq(bodyProportionGoals.ativa, true))).orderBy(desc(bodyProportionGoals.createdAt)),
    db.select().from(bodyVisualAnalyses).where(eq(bodyVisualAnalyses.userId, userId)).orderBy(desc(bodyVisualAnalyses.createdAt)),
    db.select().from(weeklyBodyReviews).where(eq(weeklyBodyReviews.userId, userId)).orderBy(desc(weeklyBodyReviews.periodoFim)),
  ]);
  return { medicoes, pesos, gorduras, fotos, metas, avaliacoesVisuais, revisoes };
}

export async function recalcularMetasProporcao(userId: string, enfases: readonly string[] = []) {
  const metas = gerarMetasProporcao(await listarMedicoesCorporais(userId), enfases);
  await db.transaction(async (tx) => {
    await tx.update(bodyProportionGoals).set({ ativa: false }).where(and(eq(bodyProportionGoals.userId, userId), eq(bodyProportionGoals.ativa, true)));
    if (metas.length) await tx.insert(bodyProportionGoals).values(metas.map((meta) => ({ userId, ...meta })));
  });
  return metas;
}
