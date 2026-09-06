import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { users, weeklyBodyReviews } from "@/db/schema";
import { obterPlanoAtivo, obterOuGerarRascunho, ativarExperimentoPlano, ativarPlano } from "../repositorio";
import {
  incorporarReavaliacaoSePropostaEstrutural,
  incorporarReavaliacaoNaRevisao,
  obterReavaliacaoDaRevisao,
  obterReavaliacaoPendente,
  rejeitarReavaliacaoDaRevisao,
  solicitarMudancaDeObjetivo,
} from "../reavaliacao";
import { obterPerfilVigente, registrarRespostas } from "@/domain/triagem/perfil";
import { obterRevisaoCorporal } from "@/domain/medicoes/repositorio";
import type { RespostasTriagem } from "@/domain/triagem/etapas";

const respostas: RespostasTriagem = {
  dataNascimento: "1995-01-01",
  sexoBiologico: "masculino",
  alturaCm: 180,
  pesoKg: 80,
  objetivoComposicao: "ganhar-massa",
  experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quinta"],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa",
  equipamentos: ["halteres", "banco-reto", "elasticos"],
};

async function prepararAtleta() {
  const [usuario] = await db
    .insert(users)
    .values({ email: `reavaliacao-${randomUUID()}@example.com` })
    .returning();
  const perfil = await registrarRespostas(usuario!.id, respostas);
  const rascunho = await obterOuGerarRascunho(usuario!.id, perfil);
  const planoAtivo = await ativarPlano(usuario!.id, rascunho.id);
  return { userId: usuario!.id, perfil, planoAtivo };
}

describe("mudança de objetivo durante um Plano Ativo", () => {
  it("versiona o perfil, abre uma reavaliação estrutural e preserva o Plano Ativo", async () => {
    const atleta = await prepararAtleta();

    const resultado = await solicitarMudancaDeObjetivo(
      atleta.userId,
      "recomposicao",
    );

    expect(resultado).toMatchObject({
      alterado: true,
      perfilVersaoAnterior: atleta.perfil.version,
      perfilVersaoNova: atleta.perfil.version + 1,
      planoAtivoId: atleta.planoAtivo.id,
      reavaliacao: {
        gatilho: "mudanca_objetivo",
        estado: "pendente",
        impacto: "estrutural",
        objetivoAnterior: "ganhar-massa",
        objetivoNovo: "recomposicao",
      },
    });
    expect((await obterPerfilVigente(atleta.userId))?.respostas.objetivoComposicao)
      .toBe("recomposicao");
    expect((await obterReavaliacaoPendente(atleta.userId))?.baselinePlanId)
      .toBe(atleta.planoAtivo.id);
    expect((await obterPlanoAtivo(atleta.userId))?.id).toBe(atleta.planoAtivo.id);
  });

  it("mantém a reavaliação pendente quando segurança impede a proposta estrutural", async () => {
    const atleta = await prepararAtleta();
    const mudanca = await solicitarMudancaDeObjetivo(atleta.userId, "recomposicao");
    if (!mudanca.alterado || !mudanca.reavaliacao) throw new Error("Mudança esperada.");
    const [revisao] = await db.insert(weeklyBodyReviews).values({
      userId: atleta.userId,
      periodoInicio: new Date("2026-01-01T00:00:00Z"),
      periodoFim: new Date("2026-01-08T00:00:00Z"),
      scorecard: {},
      confiancas: {},
      evidencias: [],
      proposta: { tipo: "manter" },
      metodologiaVersao: "teste",
    }).returning();

    const incorporada = await incorporarReavaliacaoSePropostaEstrutural(
      atleta.userId,
      mudanca.reavaliacao.id,
      revisao!.id,
      { tipo: "manter" },
    );

    expect(incorporada).toBe(false);
    expect((await obterReavaliacaoPendente(atleta.userId))?.id)
      .toBe(mudanca.reavaliacao.id);
  });

  it("encerra a reavaliação quando a proposta estrutural é rejeitada", async () => {
    const atleta = await prepararAtleta();
    const mudanca = await solicitarMudancaDeObjetivo(atleta.userId, "recomposicao");
    if (!mudanca.alterado || !mudanca.reavaliacao) throw new Error("Mudança esperada.");
    const [revisao] = await db.insert(weeklyBodyReviews).values({
      userId: atleta.userId,
      periodoInicio: new Date("2026-01-01T00:00:00Z"),
      periodoFim: new Date("2026-01-08T00:00:00Z"),
      scorecard: {},
      confiancas: {},
      evidencias: [],
      proposta: { tipo: "estrutural", gatilho: "mudanca_objetivo" },
      metodologiaVersao: "teste",
    }).returning();
    await incorporarReavaliacaoSePropostaEstrutural(
      atleta.userId,
      mudanca.reavaliacao.id,
      revisao!.id,
      { tipo: "estrutural", gatilho: "mudanca_objetivo" },
    );

    await rejeitarReavaliacaoDaRevisao(atleta.userId, revisao!.id);

    expect(await obterReavaliacaoDaRevisao(atleta.userId, revisao!.id))
      .toMatchObject({ estado: "rejeitada" });
  });

  it("marca reavaliação e revisão como aplicadas somente ao ativar o experimento", async () => {
    const atleta = await prepararAtleta();
    const mudanca = await solicitarMudancaDeObjetivo(atleta.userId, "recomposicao");
    if (!mudanca.alterado || !mudanca.reavaliacao) throw new Error("Mudança esperada.");
    const [revisao] = await db.insert(weeklyBodyReviews).values({
      userId: atleta.userId,
      periodoInicio: new Date("2026-01-01T00:00:00Z"),
      periodoFim: new Date("2026-01-08T00:00:00Z"),
      scorecard: {},
      confiancas: {},
      evidencias: [],
      proposta: { tipo: "estrutural", gatilho: "mudanca_objetivo" },
      metodologiaVersao: "teste",
    }).returning();
    await incorporarReavaliacaoSePropostaEstrutural(
      atleta.userId,
      mudanca.reavaliacao.id,
      revisao!.id,
      { tipo: "estrutural", gatilho: "mudanca_objetivo" },
    );
    const perfil = await obterPerfilVigente(atleta.userId);
    const candidato = await obterOuGerarRascunho(atleta.userId, perfil!);

    await ativarExperimentoPlano(atleta.userId, {
      planoId: candidato.id,
      reavaliacaoId: mudanca.reavaliacao.id,
      hipotese: "Energia alinhada ao novo objetivo preserva desempenho",
      variaveis: ["energia e macros"],
      criterioSucesso: "Desempenho preservado",
      criterioInterrupcao: "Recuperação baixa",
      janelaMinimaSemanas: 2,
    });

    expect(await obterReavaliacaoDaRevisao(atleta.userId, revisao!.id))
      .toMatchObject({ estado: "aplicada", candidatePlanId: candidato.id });
    expect(await obterRevisaoCorporal(atleta.userId, revisao!.id))
      .toMatchObject({ estado: "aplicada" });
  });

  it("cancela a reavaliação quando o objetivo volta ao baseline do Plano Ativo", async () => {
    const atleta = await prepararAtleta();
    await solicitarMudancaDeObjetivo(atleta.userId, "recomposicao");

    const resultado = await solicitarMudancaDeObjetivo(
      atleta.userId,
      "ganhar-massa",
    );

    expect(resultado).toMatchObject({
      alterado: true,
      planoJaAlinhado: true,
      reavaliacao: null,
    });
    expect(await obterReavaliacaoPendente(atleta.userId)).toBeNull();
  });

  it("substitui a solicitação pendente quando o objetivo muda novamente", async () => {
    const atleta = await prepararAtleta();
    await solicitarMudancaDeObjetivo(atleta.userId, "recomposicao");
    await solicitarMudancaDeObjetivo(atleta.userId, "perder-gordura");
    const vigente = await obterReavaliacaoPendente(atleta.userId);

    expect(vigente).toMatchObject({
      objetivoAnterior: "recomposicao",
      objetivoNovo: "perder-gordura",
    });
    const [revisao] = await db.insert(weeklyBodyReviews).values({
      userId: atleta.userId,
      periodoInicio: new Date("2026-01-01T00:00:00Z"),
      periodoFim: new Date("2026-01-08T00:00:00Z"),
      scorecard: {},
      confiancas: {},
      evidencias: [],
      proposta: {},
      metodologiaVersao: "teste",
    }).returning();
    await incorporarReavaliacaoNaRevisao(
      atleta.userId,
      vigente!.id,
      revisao!.id,
    );
    expect(await obterReavaliacaoPendente(atleta.userId)).toBeNull();
  });
});
