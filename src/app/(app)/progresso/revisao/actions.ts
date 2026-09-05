"use server";

import { and, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { db } from "@/db/client";
import { foodEntries, workoutSessions } from "@/db/schema";
import { avaliarConfiancaCorporal } from "@/domain/medicoes";
import { atualizarEstadoRevisaoCorporal, obterPanoramaCorporal, obterRevisaoCorporal, registrarRevisaoCorporal, vincularAjusteAutomatico } from "@/domain/medicoes/repositorio";
import { produzirRevisaoCorporal, type EvidenciaCorporal } from "@/domain/medicoes/revisao-corporal";
import { aplicarReducaoVolumeAutomatica, ativarExperimentoPlano, desfazerAjusteAutomatico, obterOuGerarRascunho, obterPlanoAtivo, reverterAoPlanoEstavel } from "@/domain/plano/repositorio";
import { incorporarReavaliacaoSePropostaEstrutural, obterReavaliacaoPendente, rejeitarReavaliacaoDaRevisao } from "@/domain/plano/reavaliacao";
import type { ExercicioSessao } from "@/domain/sessao/repositorio";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { campoNumero, campoTexto, campoTextoOpcional } from "@/lib/form-data";

const limitar = (valor: number) => Math.max(0, Math.min(100, Math.round(valor)));

export async function gerarRevisaoSemanal(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const fim = new Date(); const inicio = new Date(fim.getTime() - 7 * 86_400_000);
  const [panorama, plano, perfil, sessoes, refeicoes, reavaliacaoPendente] = await Promise.all([
    obterPanoramaCorporal(session.user.id), obterPlanoAtivo(session.user.id), obterPerfilVigente(session.user.id),
    db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, session.user.id), gte(workoutSessions.startedAt, inicio))),
    db.select().from(foodEntries).where(and(eq(foodEntries.userId, session.user.id), gte(foodEntries.consumidoEm, inicio))),
    obterReavaliacaoPendente(session.user.id),
  ]);
  const planejadasTreino = plano?.conteudo.bloco.dias.length ?? 0; const concluidas = sessoes.filter((item) => item.estado === "concluida").length;
  const planejadasRefeicao = (plano?.conteudo.nutricao.refeicoes.length ?? 0) * 7;
  const aderenciaTreino = planejadasTreino ? limitar(concluidas / planejadasTreino * 100) : 50;
  const aderenciaNutricao = planejadasRefeicao ? limitar(refeicoes.length / planejadasRefeicao * 100) : 50;
  // A carga a bater é do exercício, não da série: cada série herda a
  // marca histórica do exercício a que pertence.
  const seriesConcluidas = sessoes.flatMap((sessao) => (sessao.exercicios as ExercicioSessao[]).flatMap((exercicio) =>
    exercicio.series.filter((serie) => serie.concluida).map((serie) => ({ cargaKg: serie.cargaKg, baselineKg: exercicio.marcaAnterior?.cargaKg ?? 0 }))));
  const seriesComBaseline = seriesConcluidas.filter((serie) => serie.baselineKg > 0);
  const desempenhoScore = seriesComBaseline.length ? limitar(seriesComBaseline.filter((serie) => (serie.cargaKg ?? 0) >= serie.baselineKg).length / seriesComBaseline.length * 100) : seriesConcluidas.length ? 60 : 40;
  const evidencias: EvidenciaCorporal[] = [
    { sentido: planejadasTreino > 0 && concluidas >= planejadasTreino ? "favor" : "contra", descricao: planejadasTreino ? `${concluidas} de ${planejadasTreino} Sessões de Treino planejadas foram concluídas` : "Sem Plano Ativo para calcular aderência de treino", fonte: "Sessão de Treino", qualidade: planejadasTreino ? "alta" : "baixa", observadoEm: fim },
    { sentido: refeicoes.length ? "favor" : "contra", descricao: `${refeicoes.length} Consumos Confirmados na semana`, fonte: "Diário", qualidade: refeicoes.length ? "moderada" : "baixa", observadoEm: fim },
    { sentido: desempenhoScore >= 60 ? "favor" : "contra", descricao: seriesComBaseline.length ? `${desempenhoScore}% das séries comparáveis mantiveram ou superaram a melhor carga anterior` : "Sem séries com baseline comparável para concluir progressão de carga", fonte: "Sessão de Treino", qualidade: seriesComBaseline.length ? "alta" : "baixa", observadoEm: fim },
  ];
  const cinturas = panorama.medicoes.filter((item) => item.regiao === "cintura" && item.lado === "unico");
  const deltaCinturaMm = cinturas.length >= 2 ? cinturas[0].valorMm - cinturas[1].valorMm : null;
  const tendenciaScore = deltaCinturaMm === null ? 40 : Math.abs(deltaCinturaMm) <= 5 ? 60 : deltaCinturaMm < 0 ? 70 : 45;
  if (deltaCinturaMm !== null) evidencias.push({ sentido: Math.abs(deltaCinturaMm) <= 5 || deltaCinturaMm < 0 ? "favor" : "contra", descricao: `Cintura variou ${(deltaCinturaMm / 10).toLocaleString("pt-BR")} cm entre as duas medições comparáveis mais recentes`, fonte: "circunferência", qualidade: cinturas[0].qualidade, observadoEm: cinturas[0].observadoEm, protocolo: "fita-v1" });
  const metodos = new Set(panorama.gorduras.slice(0, 4).map((item) => `${item.metodo}:${item.protocolo ?? "sem protocolo"}`));
  if (metodos.size > 1) evidencias.push({ sentido: "contra", descricao: "Medições recentes de gordura usam método ou protocolo diferente e não foram fundidas", fonte: "Medição de Gordura Corporal", qualidade: "alta" });
  if (panorama.medicoes.length >= 3) evidencias.push({ sentido: "favor", descricao: "Há pelo menos três circunferências com proveniência e protocolo registrados", fonte: "circunferência", qualidade: "moderada" });
  const respostas = perfil?.respostas ?? {}; const regioes = new Set(panorama.medicoes.flatMap((item) => [item.regiao, `${item.regiao}:${item.lado}`]));
  const confiancas = avaliarConfiancaCorporal({ regioes, possuiGordura: panorama.gorduras.length > 0, possuiFotos: panorama.fotos.length > 0, triagemTreinoCompleta: Boolean(respostas.experienciaTreino && respostas.diasDisponiveis?.length), triagemNutricaoCompleta: Boolean(respostas.pesoKg && respostas.alturaCm), saudeInformada: respostas.lesoes !== undefined && respostas.condicoes !== undefined });
  const datas = [...panorama.medicoes.map((item) => item.observadoEm), ...panorama.pesos.map((item) => item.observadoEm)];
  const semanasObservadas = datas.length ? Math.max(1, Math.floor((fim.getTime() - Math.min(...datas.map(Number))) / (7 * 86_400_000))) : 0;
  const recuperacaoInformada = limitar(campoNumero(fd, "recuperacao", 3) * 20);
  const utilidadeInformada = limitar(campoNumero(fd, "utilidade", 3) * 20);
  evidencias.push({ sentido: recuperacaoInformada >= 60 ? "favor" : "contra", descricao: `Recuperação percebida: ${recuperacaoInformada}/100`, fonte: "relato da Revisão Semanal", qualidade: "moderada", observadoEm: fim });
  const revisao = produzirRevisaoCorporal({
    dimensoes: { aderencia: Math.round((aderenciaTreino + aderenciaNutricao) / 2), desempenho: desempenhoScore, tendenciaCorporal: tendenciaScore, recuperacao: recuperacaoInformada, utilidade: utilidadeInformada },
    confiancas,
    evidencias,
    semanasObservadas,
    riscoSaude: Boolean(respostas.lesoes?.trim()) || Boolean(respostas.condicoes?.trim()),
    reavaliacaoPendente: reavaliacaoPendente ? {
      gatilho: reavaliacaoPendente.gatilho,
      impacto: reavaliacaoPendente.impacto,
      objetivoAnterior: reavaliacaoPendente.objetivoAnterior,
      objetivoNovo: reavaliacaoPendente.objetivoNovo,
    } : undefined,
  });
  const linha = await registrarRevisaoCorporal(session.user.id, { periodoInicio: inicio, periodoFim: fim, revisao, perfilVersao: perfil?.version });
  if (reavaliacaoPendente) {
    await incorporarReavaliacaoSePropostaEstrutural(
      session.user.id,
      reavaliacaoPendente.id,
      linha.id,
      revisao.proposta,
    );
  }
  if (revisao.proposta.tipo === "auto_aplicado") {
    const ajuste = await aplicarReducaoVolumeAutomatica(session.user.id, linha.id);
    if (ajuste) await vincularAjusteAutomatico(session.user.id, linha.id, ajuste);
  }
  const destino = "/progresso/revisao/scorecard";
  invalidarLeituras([{ fato: "plano" }, { fato: "medicoes" }], { destino });
  redirect(destino);
}

export async function decidirPropostaRevisao(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const reviewId = campoTexto(fd, "reviewId"); const decisao = campoTexto(fd, "decisao");
  if (decisao === "aprovar") {
    const perfil = await obterPerfilVigente(session.user.id); if (!perfil) redirect("/triagem");
    await obterOuGerarRascunho(session.user.id, perfil);
    const aprovado = "/progresso/revisao/experimento";
    invalidarLeituras([{ fato: "plano" }], { destino: aprovado });
    redirect(aprovado);
  }
  await atualizarEstadoRevisaoCorporal(session.user.id, reviewId, "rejeitada");
  await rejeitarReavaliacaoDaRevisao(session.user.id, reviewId);
  const destino = "/progresso/revisao/proposta";
  invalidarLeituras([{ fato: "plano" }], { destino });
  redirect(destino);
}

export async function iniciarExperimento(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const variaveis = fd.getAll("variaveis").filter((v): v is string => typeof v === "string");
  await ativarExperimentoPlano(session.user.id, {
    planoId: campoTexto(fd, "planoId"),
    reavaliacaoId: campoTextoOpcional(fd, "reavaliacaoId") ?? undefined,
    hipotese: campoTexto(fd, "hipotese"),
    variaveis,
    criterioSucesso: campoTexto(fd, "criterioSucesso"),
    criterioInterrupcao: campoTexto(fd, "criterioInterrupcao"),
    janelaMinimaSemanas: campoNumero(fd, "janelaMinimaSemanas", 2),
  });
  const destino = "/progresso/revisao/experimento";
  invalidarLeituras([{ fato: "plano" }], { destino });
  redirect(destino);
}

export async function executarRollback(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  await reverterAoPlanoEstavel(session.user.id, campoTexto(fd, "experimentId"));
  const destino = "/progresso/revisao/experimento?sucesso=Plano Estável restaurado como nova versão.";
  invalidarLeituras([{ fato: "plano" }], { destino });
  redirect(destino);
}

export async function desfazerRevisao(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const reviewId = campoTexto(fd, "reviewId"); const revisao = await obterRevisaoCorporal(session.user.id, reviewId);
  if (!revisao) redirect("/progresso/revisao");
  if (revisao.baselinePlanId) {
    const rollback = await desfazerAjusteAutomatico(session.user.id, { reviewId, baselinePlanId: revisao.baselinePlanId });
    await atualizarEstadoRevisaoCorporal(session.user.id, reviewId, "desfeita", rollback.id);
  } else await atualizarEstadoRevisaoCorporal(session.user.id, reviewId, "desfeita");
  const destino = "/progresso/revisao/proposta";
  invalidarLeituras([{ fato: "plano" }], { destino });
  redirect(destino);
}
