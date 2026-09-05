import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, planExperiments, planReassessments, plans, weeklyBodyReviews } from "@/db/schema";
import { avaliarConfiancaCorporal, gerarMetasProporcao } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { gerarPlano, substituirExercicio } from "./gerador";
import { refeicoesPlanejadasValidas } from "./item-planejado";
import type { PlanoGerado } from "./tipos";
import { montarNucleo } from "@/domain/ia/contexto/nucleo";
import { gerarPlanoInicialComIA } from "@/domain/ia/operacoes/plano-inicial";
import { criarStorageR2 } from "@/infra/storage";

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

async function trilhaDeterministica(entrada: { userId: string; perfilVersao: number; operacao: "plano-treino"; resultado: unknown; campos: string[] }) {
  await db.insert(decisionTrails).values({
    userId: entrada.userId, operacao: entrada.operacao, recorteVersao: 2,
    perfilVersao: entrada.perfilVersao, modeloSolicitado: "motor-adaptativo",
    modeloResolvido: "motor-plano-v2", auditavel: true, degradado: false,
    camposEnviados: entrada.campos, camposOmitidos: [], ferramentasConsultadas: [],
    resultado: entrada.resultado,
  });
}

export type ResultadoGeracaoRascunhoIA =
  | { status: "ok"; plano: PlanoPersistido; reutilizado: boolean }
  | { status: "indisponivel"; motivo: string };

/** Gera o rascunho pelo agent; indisponibilidade nunca cai no motor local. */
export async function obterOuGerarRascunhoComIA(
  userId: string,
  perfil: { version: number; respostas: RespostasTriagem; createdAt: Date },
  origem: { tela: string; rota: string; gatilho: string },
  opcoes: { forcarNovaGeracao?: boolean } = {},
): Promise<ResultadoGeracaoRascunhoIA> {
  const [existente] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "rascunho"), eq(plans.perfilVersao, perfil.version))).orderBy(desc(plans.createdAt)).limit(1);
  if (existente && !opcoes.forcarNovaGeracao) {
    return { status: "ok", plano: mapear(existente), reutilizado: true };
  }

  const panorama = await obterPanoramaCorporal(userId);
  const nucleo = montarNucleo({
    perfilVersao: perfil.version,
    respostas: perfil.respostas,
    respondidoEm: perfil.createdAt,
    agora: new Date(),
  });
  const fotosAutorizadas = panorama.fotos.length > 0
    ? [...panorama.fotos]
        .sort((a, b) => b.observadoEm.getTime() - a.observadoEm.getTime())
        .slice(0, 4)
    : [];
  const fotosCorporais = await Promise.all(
    fotosAutorizadas.map(async (foto) => {
      const storage = criarStorageR2();
      const arquivo = await storage.ler(foto.objectKey);
      return {
        id: foto.id,
        pose: foto.pose,
        observadoEm: foto.observadoEm,
        dados: arquivo.corpo,
        mediaType: arquivo.contentType,
      };
    }),
  );
  const resultado = await gerarPlanoInicialComIA({
    userId,
    nucleo,
    triagemCompleta: perfil.respostas,
    fotosCorporais,
    linhaBaseCorporal: {
      medicoes: panorama.medicoes,
      pesos: panorama.pesos,
      gorduras: panorama.gorduras,
      avaliacoesVisuais: panorama.avaliacoesVisuais,
    },
    metasProporcao: panorama.metas,
    historicoImportado: { disponivel: false },
    origem,
  });
  if (resultado.status === "indisponivel") return resultado;

  const conteudo = resultado.valor;
  const inserido = await db.transaction(async (tx) => {
    if (opcoes.forcarNovaGeracao) {
      await tx.update(plans).set({ estado: "arquivado" }).where(and(
        eq(plans.userId, userId),
        eq(plans.estado, "rascunho"),
      ));
    }
    const [novoPlano] = await tx.insert(plans).values({ userId, perfilVersao: perfil.version, estado: "rascunho", regraVersao: conteudo.regraVersao, modoConservador: conteudo.modoConservador, conteudo }).returning();
    return novoPlano;
  });
  return { status: "ok", plano: mapear(inserido), reutilizado: false };
}

/** Motor legado, mantido para regras locais e testes; não é usado pelo clique de geração. */
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
  await trilhaDeterministica({ userId, perfilVersao: perfil.version, operacao: "plano-treino", resultado: { tipo: "plano-gerado", planoId: inserido.id, regraVersao: conteudo.regraVersao, modoConservador: conteudo.modoConservador }, campos: conteudo.dadosUsados });
  return mapear(inserido);
}

export async function obterRascunho(userId: string): Promise<PlanoPersistido | null> {
  const [linha] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "rascunho"))).orderBy(desc(plans.createdAt)).limit(1);
  return linha ? mapear(linha) : null;
}

export async function substituirNoRascunho(userId: string, entrada: { planoId: string; diaId: string; exercicioId: string; novoExercicioId: string }, respostas: RespostasTriagem): Promise<PlanoPersistido> {
  return db.transaction(async (tx) => {
    const [linha] = await tx.select().from(plans).where(and(eq(plans.id, entrada.planoId), eq(plans.userId, userId))).limit(1).for("update");
    if (linha?.estado !== "rascunho") throw new Error("Somente um rascunho pode ser alterado.");
    const conteudo = substituirExercicio(linha.conteudo as PlanoGerado, entrada, respostas);
    const [atualizado] = await tx.update(plans).set({ conteudo }).where(eq(plans.id, linha.id)).returning();
    await tx.insert(decisionTrails).values({ userId, operacao: "plano-treino", recorteVersao: 1, perfilVersao: linha.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "motor-plano-v2", auditavel: true, degradado: false, camposEnviados: ["equipamentos", "lesoes", "experienciaTreino"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "substituicao-pre-ativacao", planoId: linha.id, diaId: entrada.diaId, de: entrada.exercicioId, para: entrada.novoExercicioId } });
    return mapear(atualizado);
  });
}

/** Ativação arquiva o anterior e congela o rascunho como próxima versão. */
export async function ativarPlano(userId: string, planoId: string): Promise<PlanoPersistido> {
  return db.transaction(async (tx) => {
    const [rascunho] = await tx.select().from(plans).where(and(eq(plans.id, planoId), eq(plans.userId, userId))).limit(1).for("update");
    if (rascunho?.estado !== "rascunho") throw new Error("Plano já ativado ou inexistente.");
    const conteudo = rascunho.conteudo as PlanoGerado;
    if (!refeicoesPlanejadasValidas(conteudo.nutricao.refeicoes)) {
      throw new Error("A composição dos alimentos não está coerente com as metas das refeições.");
    }
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

export async function aplicarReducaoVolumeAutomatica(userId: string, reviewId: string) {
  return db.transaction(async (tx) => {
    const [baseline] = await tx.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1).for("update");
    if (!baseline) return null;
    const conteudo = structuredClone(baseline.conteudo as PlanoGerado);
    const exercicios = conteudo.bloco.dias.flatMap((dia) => dia.exercicios);
    const totalSeries = exercicios.reduce((total, exercicio) => total + exercicio.series, 0);
    let reducoes = Math.floor(totalSeries * 0.1);
    if (reducoes < 1) return null;
    for (const exercicio of [...exercicios].reverse()) {
      if (reducoes === 0) break;
      if (exercicio.series > 1) { exercicio.series -= 1; reducoes -= 1; }
    }
    conteudo.regraVersao = "ajuste-recuperacao-v1";
    conteudo.dadosUsados = [...conteudo.dadosUsados, `revisao-semanal:${reviewId}`];
    await tx.update(plans).set({ estado: "arquivado" }).where(eq(plans.id, baseline.id));
    const [aplicado] = await tx.insert(plans).values({ userId, perfilVersao: baseline.perfilVersao, versao: (baseline.versao ?? 0) + 1, estado: "ativo", regraVersao: conteudo.regraVersao, modoConservador: baseline.modoConservador, conteudo, activatedAt: new Date() }).returning();
    await tx.insert(decisionTrails).values({ userId, operacao: "revisao-semanal", recorteVersao: 2, perfilVersao: baseline.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "ajuste-recuperacao-v1", auditavel: true, degradado: false, camposEnviados: ["recuperacao", "volume-semanal"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "ajuste-auto-aplicado", reviewId, baselinePlanId: baseline.id, appliedPlanId: aplicado.id, limitePercentual: 10 } });
    return { baselinePlanId: baseline.id, appliedPlanId: aplicado.id };
  });
}

export async function desfazerAjusteAutomatico(userId: string, entrada: { reviewId: string; baselinePlanId: string }) {
  return db.transaction(async (tx) => {
    const [baseline] = await tx.select().from(plans).where(and(eq(plans.id, entrada.baselinePlanId), eq(plans.userId, userId))).limit(1);
    const [atual] = await tx.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.estado, "ativo"))).limit(1).for("update");
    if (!baseline || !atual) throw new Error("Versão para desfazer não encontrada.");
    await tx.update(plans).set({ estado: "arquivado" }).where(eq(plans.id, atual.id));
    const [rollback] = await tx.insert(plans).values({ userId, perfilVersao: baseline.perfilVersao, versao: (atual.versao ?? 0) + 1, estado: "ativo", regraVersao: baseline.regraVersao, modoConservador: baseline.modoConservador, conteudo: baseline.conteudo, activatedAt: new Date() }).returning();
    await tx.insert(decisionTrails).values({ userId, operacao: "revisao-semanal", recorteVersao: 2, perfilVersao: baseline.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "rollback-ajuste-v1", auditavel: true, degradado: false, camposEnviados: ["ajuste-auto-aplicado", "plano-estavel"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "ajuste-desfeito", reviewId: entrada.reviewId, de: atual.id, para: rollback.id, baselinePlanId: baseline.id } });
    return mapear(rollback);
  });
}

export async function ativarExperimentoPlano(userId: string, entrada: { planoId: string; reavaliacaoId?: string; hipotese: string; variaveis: string[]; criterioSucesso: string; criterioInterrupcao: string; janelaMinimaSemanas: number }) {
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
    if (entrada.reavaliacaoId) {
      const [reavaliacao] = await tx.update(planReassessments).set({ estado: "aplicada", candidatePlanId: ativo.id, resolvedAt: new Date() }).where(and(
        eq(planReassessments.id, entrada.reavaliacaoId),
        eq(planReassessments.userId, userId),
        eq(planReassessments.estado, "incorporada"),
      )).returning();
      if (!reavaliacao) throw new Error("Reavaliação incorporada não encontrada.");
      if (reavaliacao.reviewId) {
        await tx.update(weeklyBodyReviews).set({ estado: "aplicada", appliedPlanId: ativo.id }).where(and(
          eq(weeklyBodyReviews.id, reavaliacao.reviewId),
          eq(weeklyBodyReviews.userId, userId),
        ));
      }
    }
    await tx.insert(decisionTrails).values({ userId, operacao: "revisao-semanal", recorteVersao: 2, perfilVersao: ativo.perfilVersao, modeloSolicitado: "motor-adaptativo", modeloResolvido: "experimento-plano-v1", auditavel: true, degradado: false, camposEnviados: ["hipotese", "variaveis", "criterios", "plano-estavel"], camposOmitidos: [], ferramentasConsultadas: [], resultado: { tipo: "experimento-ativado", experimentId: linha.id, baselinePlanId: baseline.id, experimentPlanId: ativo.id, hipotese: entrada.hipotese, variaveis: entrada.variaveis } });
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
