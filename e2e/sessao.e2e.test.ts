import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans, profileVersions } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [
    { id: "superior-a", nome: "Superior A", diaSemana: "segunda",
      explicacao: { porque: "Seus 60 minutos por sessão cabem neste volume de superior.", dadosUsados: [{ campo: "duracaoSessaoMin", valor: "60 min" }] },
      exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 1, repeticoes: "8–10", rir: 2, descansoSeg: 2, justificativa: "Base de força",
        explicacao: { porque: "Halteres poupam seu ombro direito e estão na sua academia.", dadosUsados: [{ campo: "lesoes", valor: "ombro direito" }] } }] },
    { id: "inferior-a", nome: "Inferior A", diaSemana: "quinta", exercicios: [{ exercicioId: "agachamento-peso-corpo", nome: "Agachamento com peso do corpo", padrao: "agachar", series: 1, repeticoes: "10–15", rir: 2, descansoSeg: 2, justificativa: "Base de pernas" }] },
  ] },
};

const planoCopiloto: PlanoGerado = {
  ...plano,
  bloco: {
    ...plano.bloco,
    dias: [{
      ...plano.bloco.dias[0],
      exercicios: [{ ...plano.bloco.dias[0].exercicios[0], series: 3, descansoSeg: 30 }],
    }],
  },
};

const planoComExercicioDoCatalogo: PlanoGerado = {
  ...plano,
  bloco: {
    ...plano.bloco,
    dias: [{
      ...plano.bloco.dias[0],
      // Id real do catálogo (`src/domain/plano/exercicios.ts`) — só
      // com um exercício conhecido a ficha (ícone ℹ) é renderizada.
      exercicios: [{ ...plano.bloco.dias[0].exercicios[0], exercicioId: "supino-halteres", nome: "Supino reto com halteres" }],
    }],
  },
};

const planoDescanso: PlanoGerado = {
  ...plano,
  bloco: {
    ...plano.bloco,
    dias: [{
      ...plano.bloco.dias[0],
      exercicios: [{ ...plano.bloco.dias[0].exercicios[0], series: 2, descansoSeg: 90 }],
    }],
  },
};

test("escolhe o descanso entre séries e a escolha vale para o próximo timer", async ({ page, context }) => {
  const email = `e2e-descanso-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: planoDescanso.regraVersao, modoConservador: false, conteudo: planoDescanso, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();

  // Três opções derivadas do descanso prescrito (90 s), rótulo em
  // duração e não em adjetivo.
  const seletor = page.getByRole("radiogroup", { name: "Descanso entre séries" });
  await expect(seletor).toBeVisible();
  await expect(seletor.getByRole("radio")).toHaveCount(3);
  await expect(page.getByRole("radio", { name: "Descanso do plano: 1:30" })).toBeChecked();

  await page.getByRole("radio", { name: "Descanso longo: 2:15" }).check();
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("20");
  await page.getByLabel("Registrar série 1").click();
  const timer = page.getByRole("dialog", { name: "Timer de descanso" });
  await expect(timer).toContainText("2:1");
  await page.getByRole("button", { name: "Fechar timer" }).click();

  // A escolha é do exercício, não do timer aberto: sobrevive a recarregar
  // a página e continua valendo para a série seguinte.
  await page.reload();
  await expect(page.getByRole("radio", { name: "Descanso longo: 2:15" })).toBeChecked();

  await page.getByRole("radio", { name: "Descanso curto: 1:00" }).check();
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("20");
  await page.getByLabel("Registrar série 2").click();
  await expect(timer).toContainText("1:0");
  await page.getByRole("button", { name: "Fechar timer" }).click();
});

test("executa o treino do dia, usa o timer e consulta o resumo no histórico", async ({ page, context }) => {
  const email = `e2e-sessao-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Superior A" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Superior A/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inferior A/ })).toBeVisible();
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await expect(page).toHaveURL(/\/sessao\/previa\/superior-a$/);
  await expect(page.getByText("1 exercícios · 1 séries").first()).toBeVisible();

  // A explicação do agent precisa sobreviver ao onboarding: quem abre a
  // prévia semanas depois é justamente quem esqueceu o motivo.
  await page.getByText("Por que este exercício?").click();
  await expect(page.getByText(/Halteres poupam seu ombro direito/)).toBeVisible();

  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByText("SESSÃO EM ANDAMENTO")).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir treino" })).toBeEnabled();

  // O motivo sobrevive ao congelamento do snapshot e continua ao alcance
  // durante a execução — sem ocupar a tela, porque aqui o atleta está
  // sob carga.
  await page.getByText("Por que este exercício?").click();
  await expect(page.getByText(/Halteres poupam seu ombro direito/)).toBeVisible();

  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("20");
  await page.getByLabel("Registrar série 1").click();
  const timer = page.getByRole("dialog", { name: "Timer de descanso" });
  await expect(timer).toBeVisible();
  await expect(timer).toBeHidden({ timeout: 5_000 });
  await page.getByRole("button", { name: "Concluir treino" }).click();

  await expect(page.getByText("Treino concluído")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Ver histórico de sessões" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();

  // Concluir hoje não bloqueia a sequência até amanhã: o próximo dia
  // do bloco fica disponível imediatamente, e os demais seguem livres.
  await page.goto("/inicio");
  await expect(page.getByText("Próximo treino")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inferior A" })).toBeVisible();
  await expect(page.getByText("1 de 2 treinos concluídos nos últimos 7 dias")).toBeVisible();
  await expect(page.getByRole("link", { name: /Superior A/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inferior A/ })).toBeVisible();
});

test("mostra orientação assíncrona do Copiloto e cai para o Coach Local ao perder a rede", async ({ page, context }) => {
  const email = `e2e-copiloto-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(profileVersions).values({
    userId: user.id,
    version: 1,
    respostas: { experienciaTreino: "intermediario", equipamentos: ["halteres"] },
  });
  await db.insert(plans).values({
    userId: user.id,
    perfilVersao: 1,
    versao: 1,
    estado: "ativo",
    regraVersao: planoCopiloto.regraVersao,
    modoConservador: false,
    conteudo: planoCopiloto,
    activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();

  // A sincronização alimenta o Copiloto, mas o descanso é relógio do atleta:
  // mesmo com a rede lenta, o modal precisa abrir sem aguardar esse POST.
  await page.route("**/api/sessao/*/sincronizar", async (rota) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await rota.continue();
  }, { times: 1 });
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("20");
  await page.getByLabel("Registrar série 1").click();
  await expect(page.getByRole("dialog", { name: "Timer de descanso" })).toBeVisible({ timeout: 500 });
  await page.getByRole("button", { name: "Fechar timer" }).click();

  await expect(page.getByRole("region", { name: "Orientação do Copiloto" })).toContainText("Copiloto (IA)");
  await expect(page.getByRole("region", { name: "Orientação do Copiloto" })).toContainText("26 kg · 9 reps · RIR 2");

  await context.setOffline(true);
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("20");
  await page.getByLabel("Registrar série 2").click();
  await page.getByRole("button", { name: "Fechar timer" }).click();
  await expect(page.getByRole("region", { name: "Orientações do Coach Local" })).toContainText("Coach Local (regra)");
  await expect(page.getByRole("region", { name: "Orientações do Coach Local" })).toContainText("nenhuma sugestão de IA");
});

test("usa o Coach Local sem simular IA quando o provedor está indisponível", async ({ page, context }) => {
  const email = `e2e-copiloto-indisponivel-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(profileVersions).values({ userId: user.id, version: 1, respostas: { experienciaTreino: "intermediario" } });
  await db.insert(plans).values({
    userId: user.id,
    perfilVersao: 1,
    versao: 1,
    estado: "ativo",
    regraVersao: planoCopiloto.regraVersao,
    modoConservador: false,
    conteudo: planoCopiloto,
    activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("13");
  await page.locator('input[name="cargaKg"]:not(:disabled)').first().fill("13");
  await page.getByLabel("Registrar série 1").click();
  await page.getByRole("button", { name: "Fechar timer" }).click();

  const local = page.getByRole("region", { name: "Orientações do Coach Local" });
  // O SDK tenta o provedor novamente antes de declarar indisponibilidade;
  // o fallback precisa cobrir a janela completa dessa política de retry.
  await expect(local).toContainText("Coach Local (regra)", { timeout: 15_000 });
  await expect(local).toContainText("Copiloto indisponível: nenhuma sugestão de IA");
});

test("mostra o fallback em texto da ficha do exercício quando não há Mídia de Execução disponível", async ({ page, context }) => {
  // Caminho do CI: sem R2 configurado, a rota /api/midia-execucao
  // devolve 404 (falha fechada) e a ficha precisa continuar útil com
  // o texto de execução e o diagrama de músculos-alvo, sem depender de
  // rede externa à ExerciseDB (docs/memory/mudanca-ui-atualiza-e2e.md).
  const email = `e2e-ficha-exercicio-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: planoComExercicioDoCatalogo.regraVersao, modoConservador: false, conteudo: planoComExercicioDoCatalogo, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await page.goto("/inicio");
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await page.getByRole("button", { name: /Iniciar treino/ }).click();

  await page.getByRole("button", { name: "Ver como executar Supino reto com halteres" }).click();
  const ficha = page.getByRole("dialog", { name: "Supino reto com halteres" });
  await expect(ficha).toBeVisible();
  await expect(ficha.locator("img")).toHaveCount(0);
  await expect(ficha.getByRole("heading", { name: "Supino reto com halteres" })).toBeVisible();
  await expect(ficha.getByText("Como executar")).toBeVisible();
  await expect(ficha.getByText(/Deitado no banco/)).toBeVisible();
});
