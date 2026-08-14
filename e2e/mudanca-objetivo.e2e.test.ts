import { expect, test } from "@playwright/test";
import { seedAuthenticatedSession } from "./helpers/seed-session";
import { registrarRespostas } from "@/domain/triagem/perfil";
import { ativarPlano, obterOuGerarRascunho } from "@/domain/plano/repositorio";
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
  lesoes: "",
  condicoes: "",
};

test("muda o objetivo sem substituir o Plano Ativo antes da Revisão Semanal", async ({ page, context }) => {
  const { user, cookie } = await seedAuthenticatedSession(
    `e2e-objetivo-${Date.now()}@example.com`,
  );
  const perfil = await registrarRespostas(user.id, respostas);
  const rascunho = await obterOuGerarRascunho(user.id, perfil);
  await ativarPlano(user.id, rascunho.id);
  await context.addCookies([cookie]);

  await page.goto("/mais");
  await page.getByRole("link", { name: /Objetivo e estratégia/ }).click();
  await page.getByLabel("Recomposição corporal").check();
  await page.getByRole("button", { name: "Salvar objetivo" }).click();

  await expect(page.getByText("Objetivo atualizado.")).toBeVisible();
  await expect(page.getByText("Reavaliação pendente")).toBeVisible();
  await page.goto("/inicio");
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await page.goto("/progresso");
  await expect(page.getByText("Seu objetivo mudou.")).toBeVisible();
  await page.getByRole("link", { name: "Iniciar ou revisar" }).click();
  await page.getByRole("button", { name: "Iniciar revisão" }).click();
  await page.getByRole("link", { name: "Ver evidências" }).click();
  await page.getByRole("link", { name: "Ver proposta" }).click();
  await expect(page.getByRole("heading", { name: "Proposta estrutural" })).toBeVisible();
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page.getByText("Comparação do plano")).toBeVisible();
  await expect(page.getByText("Recomposição corporal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ativar Experimento de Plano" }).click();
  await expect(page.getByText("Experimento ativo")).toBeVisible();
  await page.goto("/inicio");
  await expect(page.getByText("v2", { exact: true })).toBeVisible();
});
