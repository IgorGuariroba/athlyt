import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans, profileVersions } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior", dias: [{ id: "superior-a", nome: "Superior A", diaSemana: "segunda", exercicios: [{ exercicioId: "supino-barra", nome: "Supino reto com barra", padrao: "empurrar-horizontal", series: 1, repeticoes: "6–10", rir: 2, descansoSeg: 2, justificativa: "Base de força" }] }] },
};

const planoTresSeries: PlanoGerado = {
  ...plano,
  bloco: { ...plano.bloco, dias: [{ ...plano.bloco.dias[0], exercicios: [{ ...plano.bloco.dias[0].exercicios[0], series: 3 }] }] },
};

test("substitui exercício por equipamento indisponível preservando o estímulo", async ({ page, context }) => {
  const email = `e2e-subst-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(profileVersions).values({ userId: user.id, version: 1, respostas: { equipamentos: ["halteres", "banco-reto", "supino-maquina"], experienciaTreino: "intermediario" } });
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByRole("heading", { name: "Supino reto com barra" })).toBeVisible();

  await page.getByRole("link", { name: "Substituir Supino reto com barra" }).click();
  await expect(page.getByText(/não troca exercícios por variedade/)).toBeVisible();
  await page.getByRole("link", { name: /Equipamento indisponível/ }).click();
  await expect(page.getByText("Mesmo estímulo").first()).toBeVisible();

  await page.getByRole("button", { name: "Substituir por Supino reto com halteres" }).click();
  await expect(page.getByRole("heading", { name: "Supino reto com halteres" })).toBeVisible();
  await expect(page.getByText(/Substitui/)).toContainText("Supino reto com barra");

  await page.getByLabel("Registrar série 1").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByText("Treino concluído")).toBeVisible();

  // A troca por equipamento persiste: a próxima sessão do mesmo dia já
  // nasce com o exercício substituído. Como o bloco tem um único dia,
  // concluir a sessão libera imediatamente esse treino outra vez.
  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Superior A" })).toBeVisible();
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByRole("heading", { name: "Supino reto com halteres" })).toBeVisible();
});

test("substitui no meio da execução quando a dor aparece durante o exercício", async ({ page, context }) => {
  const email = `e2e-dor-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(profileVersions).values({ userId: user.id, version: 1, respostas: { equipamentos: ["halteres", "banco-reto", "supino-maquina"], experienciaTreino: "intermediario" } });
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: planoTresSeries.regraVersao, modoConservador: false, conteudo: planoTresSeries, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/sessao/previa/superior-a");
  await page.getByRole("button", { name: /Iniciar treino/ }).click();

  // O atleta faz a primeira série e só então sente dor — é impossível
  // saber antes de executar.
  await page.getByLabel("Registrar série 1").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();

  await page.getByRole("link", { name: "Substituir Supino reto com barra" }).click();
  await page.getByRole("link", { name: /Dor ou desconforto/ }).click();
  await page.getByLabel("Onde dói?").fill("ombro");
  await page.getByRole("button", { name: "Filtrar sugestões" }).click();
  await page.getByRole("button", { name: "Substituir por Supino na máquina" }).click();

  // O substituto assume apenas as séries que faltavam.
  await expect(page.getByRole("heading", { name: "Supino na máquina" })).toBeVisible();
  await expect(page.getByText("Exercício 2 de 2")).toBeVisible();
  await expect(page.getByText(/^2 séries ·/)).toBeVisible();

  // A série já executada continua contando na sessão.
  await expect(page.getByText("1/3")).toBeVisible();
  await page.getByLabel("Registrar série 1").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();
  await page.getByLabel("Registrar série 2").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();
  await page.getByRole("button", { name: "Concluir treino" }).click();

  await expect(page.getByText("Treino concluído")).toBeVisible();
  await expect(page.getByText(/Interrompido após 1 de 3 séries/)).toBeVisible();
});
