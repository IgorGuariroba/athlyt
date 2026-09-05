import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans, workoutSessions } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";
import {
  abrirSessaoEmAndamento,
  concluirTreino,
  concluirTreinoSincronizado,
  esperarRegistroIndisponivel,
  pularDescanso,
  registrarSerie,
} from "./helpers/sessao";

/**
 * Jornada offline da Sessão de Treino.
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

  await abrirSessaoEmAndamento(page);

  // Badge visível já no estado normal — não é um alerta que só aparece
  // quando algo quebra.
  await expect(page.getByLabel(/Estado da conexão: Online/)).toBeVisible();

  await registrarSerie(page, 1);
  await pularDescanso(page);

  // ---- rede cai no meio do treino ----
  await context.setOffline(true);
  await expect(page.getByLabel(/Estado da conexão: Offline/)).toBeVisible();
  // Registro de série continua funcionando, e o timer também.
  await registrarSerie(page, 2);
  const timerOffline = page.getByRole("dialog", { name: "Timer de descanso" });
  await expect(timerOffline).toBeVisible();
  await expect(timerOffline).toBeHidden({ timeout: 5_000 });

  await registrarSerie(page, 3);
  await pularDescanso(page);

  // A fila é visível no badge: nada foi perdido nem enviado.
  await expect(page.getByLabel(/Estado da conexão: Offline, 2 na fila/)).toBeVisible();

  // Concluir offline não trava esperando a rede.
  await concluirTreino(page, { confirmacao: "Treino encerrado neste aparelho" });

  // ---- rede volta ----
  await context.setOffline(false);
  await expect(page.getByLabel(/Estado da conexão: Online$/)).toBeVisible();

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

/**
 * O caso de um aparelho só, sem corrida: encerrar offline e só então
 * tentar registrar. A série teria ordem maior que o encerramento e
 * entraria numa sessão já concluída — mudando o resumo daquele treino
 * depois do fato.
 */
test("não oferece registro depois de encerrar offline, e o resumo não muda ao reconectar", async ({ page, context }) => {
  const email = `e2e-offline-fim-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await abrirSessaoEmAndamento(page);
  await registrarSerie(page, 1);
  await pularDescanso(page);

  await context.setOffline(true);
  await expect(page.getByLabel(/Estado da conexão: Offline/)).toBeVisible();
  await registrarSerie(page, 2);
  await pularDescanso(page);

  await concluirTreino(page, { confirmacao: "Treino encerrado neste aparelho" });

  // A terceira série deixa de ser oferecida: a regra de UI é o que para
  // de *produzir* o evento tardio.
  await esperarRegistroIndisponivel(page, 3);

  await context.setOffline(false);
  await expect(page.getByLabel(/Estado da conexão: Online$/)).toBeVisible();

  await page.goto("/mais/sincronizacao");
  await expect(page.getByRole("heading", { name: "Pendências (0)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conflitos (0)" })).toBeVisible();

  // Fecha o ciclo por navegação real: o resumo persistido contém as duas
  // séries de fato executadas, nem uma a mais.
  await page.goto("/sessao/historico");
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  await expect(page.getByText("2 séries")).toBeVisible();
});

/**
 * O selo de recorde visto durante o treino offline precisa sobreviver à
 * sincronização. A referência de cada série soma as anteriores — e
 * offline as anteriores estão só na fila local: sem elas, a série 2
 * abaixo (mais fraca que a 1, mais forte que o histórico) anunciava um
 * recorde que o resumo depois atribuía à série 1, retirando da tela o
 * selo que o atleta tinha visto.
 */
test("o selo de recorde visto offline é o mesmo que o resumo confirma depois de sincronizar", async ({ page, context }) => {
  const email = `e2e-offline-recorde-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  const [planoSalvo] = await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() }).returning();
  // Histórico do exercício: 20 kg × 8. É a marca a bater.
  await db.insert(workoutSessions).values({
    userId: user.id, planId: planoSalvo!.id, diaId: "superior-a", nome: "Superior A", estado: "concluida",
    exercicios: [{
      exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", descansoSeg: 1,
      series: [{ numero: 1, repeticoesSugeridas: "8–10", cargaKg: 20, cargaSugeridaKg: 20, repeticoes: 8, rir: 2, concluida: true }],
    }],
    startedAt: new Date(Date.now() - 7 * 86_400_000), endedAt: new Date(Date.now() - 7 * 86_400_000),
  });
  await context.addCookies([cookie]);

  await abrirSessaoEmAndamento(page);
  const urlDaSessao = page.url();
  await context.setOffline(true);
  await expect(page.getByLabel(/Estado da conexão: Offline/)).toBeVisible();

  // Série 1 supera o histórico: o selo aparece no treino.
  await registrarSerie(page, 1, { carga: "30" });
  await expect(page.getByText("Novo recorde de força")).toBeVisible();
  await pularDescanso(page);

  // Série 2 é mais fraca que a 1 e mais forte que o histórico. A marca a
  // bater agora é a da série 1, ainda na fila local: nenhum selo novo.
  await registrarSerie(page, 2, { carga: "25" });
  await expect(page.getByText("Novo recorde de força")).toHaveCount(0);
  await pularDescanso(page);

  await context.setOffline(false);
  await expect(page.getByLabel(/Estado da conexão: Online$/)).toBeVisible();
  await page.goto("/mais/sincronizacao");
  await expect(page.getByRole("heading", { name: "Pendências (0)" })).toBeVisible();

  // Volta pela URL da sessão: com uma sessão em andamento, a aba Treino
  // não oferece mais iniciar.
  await page.goto(urlDaSessao);
  await concluirTreinoSincronizado(page);

  // O resumo confirma o recorde da série 1 — o mesmo 1RM estimado que a
  // tela reconheceu (30 × 8 por Epley).
  await expect(page).toHaveURL(/\/sessao\/[^/]+\/resumo$/);
  await expect(page.getByText("Recordes da sessão")).toBeVisible();
  await expect(page.getByText("38 kg")).toBeVisible();
});
