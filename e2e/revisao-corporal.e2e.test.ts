import { expect, test } from "@playwright/test";
import { aguardarHidratacao } from "./helpers/hidratacao";
import { seedAuthenticatedSession } from "./helpers/seed-session";

test("conduz a Revisão Semanal sem inventar evidência ausente", async ({ page, context }) => {
  const { cookie } = await seedAuthenticatedSession(`e2e-revisao-${Date.now()}@example.com`);
  await context.addCookies([cookie]);
  await page.goto("/progresso/revisao");
  await aguardarHidratacao(page);
  await page.getByRole("button", { name: "Iniciar revisão" }).click();
  await expect(page.getByRole("heading", { name: "Scorecard de Progresso" })).toBeVisible();
  await page.waitForURL("**/progresso/revisao/scorecard");
  await expect(page.getByText("Tendência corporal")).toBeVisible();
  await page.getByRole("link", { name: "Ver evidências" }).click();
  await page.waitForURL("**/progresso/revisao/evidencias");
  await expect(page.getByRole("heading", { name: "Evidências e incertezas" })).toBeVisible();
  await expect(page.getByText("Sem Plano Ativo para calcular aderência de treino")).toBeVisible();
  await page.getByRole("link", { name: "Ver proposta" }).click();
  await page.waitForURL("**/progresso/revisao/proposta");
  await expect(page.getByRole("heading", { name: "Manter Plano Ativo" })).toBeVisible();
});
