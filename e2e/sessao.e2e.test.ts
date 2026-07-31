import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [{ id: "superior-a", nome: "Superior A", diaSemana: "segunda", exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 1, repeticoes: "8–10", rir: 2, descansoSeg: 2, justificativa: "Base de força" }] }] },
};

test("executa o treino do dia, usa o timer e consulta o resumo no histórico", async ({ page, context }) => {
  const email = `e2e-sessao-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Superior A" })).toBeVisible();
  await page.getByRole("button", { name: /Iniciar sessão/ }).click();
  await expect(page.getByText("SESSÃO EM ANDAMENTO")).toBeVisible();

  await page.getByLabel("Registrar série 1").click();
  await expect(page.getByRole("dialog", { name: "Timer de descanso" })).toBeVisible();
  await expect(page.getByText("0:00")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Pular descanso" }).click();
  await page.getByRole("button", { name: "Concluir treino" }).click();

  await expect(page.getByText("Treino concluído")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Ver histórico de sessões" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
});
