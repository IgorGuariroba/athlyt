import { expect, test } from "@playwright/test";
import { avaliarConfiancaCorporal } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { abrirEvidenciasDaRevisao, abrirPendenciaDeTreinamentoEVoltar, abrirPropostaDaRevisao, conferirPendenciasDePersonalizacao, conferirPlanoOriginalNoTreino, concluirRevisaoEVoltarAoTreino, iniciarRevisao } from "./helpers/revisao-corporal";
import { lerEstadoAposRevisao, seedAtletaComApenasTreinamentoPendente, seedAtletaComConfiancaIncompleta } from "./helpers/seed-revisao-corporal";
import { seedAuthenticatedSession } from "./helpers/seed-session";

test("conduz a Revisão Semanal sem inventar evidência ausente", async ({ page, context }) => {
  const { cookie } = await seedAuthenticatedSession(`e2e-revisao-${Date.now()}@example.com`);
  await context.addCookies([cookie]);
  await iniciarRevisao(page);
  await expect(page.getByText("Tendência corporal")).toBeVisible();
  await abrirEvidenciasDaRevisao(page);
  await expect(page.getByText("Sem Plano Ativo para calcular aderência de treino")).toBeVisible();
  await abrirPropostaDaRevisao(page);
  await expect(page.getByRole("heading", { name: "Manter Plano Ativo" })).toBeVisible();
});

test("#197: pendência de triagem única explica o que falta e leva à etapa certa", async ({ page, context }) => {
  const { cookie } = await seedAtletaComApenasTreinamentoPendente();
  await context.addCookies([cookie]);

  await page.goto("/treino");
  await conferirPlanoOriginalNoTreino(page);
  await conferirPendenciasDePersonalizacao(page, ["Treinamento"]);
  await abrirPendenciaDeTreinamentoEVoltar(page);
  await conferirPendenciasDePersonalizacao(page, ["Treinamento"]);
});

test("#197: confiança 3/6 mantém o Plano Ativo com recuperação baixa e pendências após retornar ao Treino", async ({ page, context }) => {
  const { cookie, user, respostas, plano } = await seedAtletaComConfiancaIncompleta();
  const panorama = await obterPanoramaCorporal(user.id);
  const confiancas = avaliarConfiancaCorporal(panorama, respostas);
  expect(confiancas).toEqual({
    composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "limitada",
    treinamento: "indisponivel", nutricao: "indisponivel", saudeRecuperacao: "confiavel",
  });
  expect(Object.values(confiancas).filter((valor) => valor === "confiavel")).toHaveLength(3);
  expect(panorama.fotos).toHaveLength(0);
  await context.addCookies([cookie]);

  await page.goto("/treino");
  await conferirPlanoOriginalNoTreino(page);
  await conferirPendenciasDePersonalizacao(page);

  await iniciarRevisao(page, "Baixa");
  const confiancaVisivel = page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { name: "Confiança por dimensão" }) });
  await expect(confiancaVisivel.getByText("confiavel", { exact: true })).toHaveCount(3);
  await expect(confiancaVisivel.getByText("limitada", { exact: true })).toHaveCount(1);
  await expect(confiancaVisivel.getByText("indisponivel", { exact: true })).toHaveCount(2);
  await abrirEvidenciasDaRevisao(page);
  await expect(page.getByRole("main").getByText("Recuperação percebida: 40/100", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("1 de 1 Sessões de Treino planejadas foram concluídas", { exact: true })).toBeVisible();
  await abrirPropostaDaRevisao(page);
  await expect(page.getByRole("heading", { name: "Manter Plano Ativo" })).toBeVisible();
  // Escopo ao `main` voltou a ser o padrão seguro: com o casco
  // dono do landmark, há um único `main` por página (issue #200).
  await expect(page.getByRole("main")).toContainText(
    "Ainda não há evidência comparável suficiente para mudar o Plano Ativo.",
  );
  await expect(page.getByRole("button", { name: "Desfazer proposta" })).toHaveCount(0);

  await concluirRevisaoEVoltarAoTreino(page);
  await conferirPlanoOriginalNoTreino(page);
  await conferirPendenciasDePersonalizacao(page);

  const { planos, revisoes } = await lerEstadoAposRevisao(user.id);
  expect(planos).toHaveLength(1);
  expect(planos[0]).toMatchObject({ id: plano.id, estado: "ativo", versao: 1, conteudo: plano.conteudo });
  expect(revisoes).toHaveLength(1);
  expect(revisoes[0]).toMatchObject({
    confiancas, scorecard: { recuperacao: 40 }, proposta: { tipo: "manter" },
    baselinePlanId: null, appliedPlanId: null,
  });
});
