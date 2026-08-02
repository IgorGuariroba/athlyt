"use server";

import { and, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { foodEntries, workoutSessions } from "@/db/schema";
import { avaliarConfiancaCorporal } from "@/domain/medicoes";
import { atualizarEstadoRevisaoCorporal, obterPanoramaCorporal, registrarRevisaoCorporal } from "@/domain/medicoes/repositorio";
import { produzirRevisaoCorporal, type EvidenciaCorporal } from "@/domain/medicoes/revisao-corporal";
import { ativarExperimentoPlano, obterOuGerarRascunho, obterPlanoAtivo, reverterAoPlanoEstavel } from "@/domain/plano/repositorio";
import { obterPerfilVigente } from "@/domain/triagem/perfil";

const limitar = (valor: number) => Math.max(0, Math.min(100, Math.round(valor)));

export async function gerarRevisaoSemanal() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const fim = new Date(); const inicio = new Date(fim.getTime() - 7 * 86_400_000);
  const [panorama, plano, perfil, sessoes, refeicoes] = await Promise.all([
    obterPanoramaCorporal(session.user.id), obterPlanoAtivo(session.user.id), obterPerfilVigente(session.user.id),
    db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, session.user.id), gte(workoutSessions.startedAt, inicio))),
    db.select().from(foodEntries).where(and(eq(foodEntries.userId, session.user.id), gte(foodEntries.consumidoEm, inicio))),
  ]);
  const planejadasTreino = plano?.conteudo.bloco.dias.length ?? 0; const concluidas = sessoes.filter((item) => item.estado === "concluida").length;
  const planejadasRefeicao = (plano?.conteudo.nutricao.refeicoes.length ?? 0) * 7;
  const aderenciaTreino = planejadasTreino ? limitar(concluidas / planejadasTreino * 100) : 50;
  const aderenciaNutricao = planejadasRefeicao ? limitar(refeicoes.length / planejadasRefeicao * 100) : 50;
  const evidencias: EvidenciaCorporal[] = [
    { sentido: planejadasTreino > 0 && concluidas >= planejadasTreino ? "favor" : "contra", descricao: planejadasTreino ? `${concluidas} de ${planejadasTreino} Sessões de Treino planejadas foram concluídas` : "Sem Plano Ativo para calcular aderência de treino", fonte: "Sessão de Treino", qualidade: planejadasTreino ? "alta" : "baixa", observadoEm: fim },
    { sentido: refeicoes.length ? "favor" : "contra", descricao: `${refeicoes.length} Consumos Confirmados na semana`, fonte: "Diário", qualidade: refeicoes.length ? "moderada" : "baixa", observadoEm: fim },
  ];
  const metodos = new Set(panorama.gorduras.slice(0, 4).map((item) => `${item.metodo}:${item.protocolo ?? "sem protocolo"}`));
  if (metodos.size > 1) evidencias.push({ sentido: "contra", descricao: "Medições recentes de gordura usam método ou protocolo diferente e não foram fundidas", fonte: "Medição de Gordura Corporal", qualidade: "alta" });
  if (panorama.medicoes.length >= 3) evidencias.push({ sentido: "favor", descricao: "Há pelo menos três circunferências com proveniência e protocolo registrados", fonte: "circunferência", qualidade: "moderada" });
  const respostas = perfil?.respostas ?? {}; const regioes = new Set(panorama.medicoes.flatMap((item) => [item.regiao, `${item.regiao}:${item.lado}`]));
  const confiancas = avaliarConfiancaCorporal({ regioes, possuiGordura: panorama.gorduras.length > 0, possuiFotos: panorama.fotos.length > 0, triagemTreinoCompleta: Boolean(respostas.experienciaTreino && respostas.diasDisponiveis?.length), triagemNutricaoCompleta: Boolean(respostas.pesoKg && respostas.alturaCm), saudeInformada: respostas.lesoes !== undefined && respostas.condicoes !== undefined });
  const datas = [...panorama.medicoes.map((item) => item.observadoEm), ...panorama.pesos.map((item) => item.observadoEm)];
  const semanasObservadas = datas.length ? Math.max(1, Math.floor((fim.getTime() - Math.min(...datas.map(Number))) / (7 * 86_400_000))) : 0;
  const revisao = produzirRevisaoCorporal({ dimensoes: { aderencia: Math.round((aderenciaTreino + aderenciaNutricao) / 2), desempenho: concluidas ? 70 : 40, tendenciaCorporal: panorama.medicoes.length >= 3 ? 65 : 40, recuperacao: respostas.lesoes || respostas.condicoes ? 45 : 65, utilidade: 50 }, confiancas, evidencias, semanasObservadas, riscoSaude: Boolean(respostas.lesoes?.trim() || respostas.condicoes?.trim()) });
  await registrarRevisaoCorporal(session.user.id, { periodoInicio: inicio, periodoFim: fim, revisao, perfilVersao: perfil?.version });
  revalidatePath("/progresso/revisao"); redirect("/progresso/revisao/scorecard");
}

export async function decidirPropostaRevisao(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const reviewId = String(fd.get("reviewId")); const decisao = String(fd.get("decisao"));
  if (decisao === "aprovar") {
    const perfil = await obterPerfilVigente(session.user.id); if (!perfil) redirect("/triagem");
    await atualizarEstadoRevisaoCorporal(session.user.id, reviewId, "aplicada");
    await obterOuGerarRascunho(session.user.id, perfil);
    revalidatePath("/plano/revisao"); redirect("/progresso/revisao/experimento");
  }
  await atualizarEstadoRevisaoCorporal(session.user.id, reviewId, "rejeitada");
  revalidatePath("/progresso/revisao"); redirect("/progresso/revisao/proposta");
}

export async function iniciarExperimento(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const variaveis = fd.getAll("variaveis").map(String);
  await ativarExperimentoPlano(session.user.id, { planoId: String(fd.get("planoId")), hipotese: String(fd.get("hipotese") ?? ""), variaveis, criterioSucesso: String(fd.get("criterioSucesso") ?? ""), criterioInterrupcao: String(fd.get("criterioInterrupcao") ?? ""), janelaMinimaSemanas: Number(fd.get("janelaMinimaSemanas") ?? 2) });
  revalidatePath("/inicio"); revalidatePath("/progresso"); redirect("/progresso/revisao/experimento");
}

export async function executarRollback(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  await reverterAoPlanoEstavel(session.user.id, String(fd.get("experimentId")));
  revalidatePath("/inicio"); revalidatePath("/progresso"); redirect("/progresso/revisao/experimento?sucesso=Plano Estável restaurado como nova versão.");
}

export async function desfazerRevisao(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  await atualizarEstadoRevisaoCorporal(session.user.id, String(fd.get("reviewId")), "desfeita");
  revalidatePath("/progresso/revisao"); redirect("/progresso/revisao/proposta");
}
