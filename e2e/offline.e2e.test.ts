import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Jornada offline da Sessão de Treino (user stories 37–39; telas 042 e 085).
 *
 * A rede é derrubada no meio da sessão, e não antes: o caso que
 * importa é o atleta que já começou o treino e perde o sinal, não o
 * que abre o app sem internet.
 */
const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [
    { id: "superior-a", nome: "Superior A", diaSemana: "segunda", exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 3, repeticoes: "8–10", rir: 2, descansoSeg: 1, justificativa: "Base de força" }] },
  ] },
};

test("mantém a sessão viva sem rede e sincroniza a fila ao reconectar", async ({ page, context }) => {
  const email = `e2e-offline-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByText("SESSÃO EM ANDAMENTO")).toBeVisible();

  // Badge visível já no estado normal — não é um alerta que só aparece
  // quando algo quebra.
  await expect(page.getByLabel(/Estado da conexão: Online/)).toBeVisible();

  // Online, o Coach Local não ocupa o lugar do Copiloto antes de qualquer
  // série: ele é contingência, não a experiência principal.
  await expect(page.getByLabel("Orientações do Coach Local")).toHaveCount(0);

  await page.getByLabel("Registrar série 1").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();

  // ---- rede cai no meio do treino ----
  await context.setOffline(true);
  await expect(page.getByLabel(/Estado da conexão: Offline/)).toBeVisible();
  const coachLocal = page.getByLabel("Orientações do Coach Local");
  await expect(coachLocal).toContainText("origem: regra local");
  await expect(coachLocal).toContainText("coach-local-v1");
  await expect(coachLocal).toContainText("Sem rede: nenhuma sugestão de IA é gerada aqui.");

  // Registro de série continua funcionando, e o timer também.
  await page.getByLabel("Registrar série 2").click();
  const timerOffline = page.getByRole("dialog", { name: "Timer de descanso" });
  await expect(timerOffline).toBeVisible();
  await expect(timerOffline).toBeHidden({ timeout: 5_000 });

  await page.getByLabel("Registrar série 3").click();
  await page.getByRole("button", { name: "Pular descanso" }).click();

  // A fila é visível no badge: nada foi perdido nem enviado.
  await expect(page.getByLabel(/Estado da conexão: Offline, 2 na fila/)).toBeVisible();

  // Concluir offline não trava esperando a rede.
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByText("Treino encerrado neste aparelho")).toBeVisible();

  // ---- rede volta ----
  await context.setOffline(false);
  await expect(page.getByLabel(/Estado da conexão: Online$/)).toBeVisible({ timeout: 15_000 });

  // A fila drenou: nada pendente e nenhum conflito.
  await page.goto("/mais/sincronizacao");
  await expect(page.getByRole("heading", { name: "Pendências (0)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conflitos (0)" })).toBeVisible();
  await expect(page.getByText("Tudo sincronizado")).toBeVisible();

  // As três séries chegaram ao servidor uma única vez e a sessão foi
  // encerrada pelo evento offline.
  await page.goto("/sessao/historico");
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  await expect(page.getByText("3 séries")).toBeVisible();
});
