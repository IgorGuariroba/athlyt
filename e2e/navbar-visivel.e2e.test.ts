import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const ex = (id: string, nome: string, padrao: string, reps: string) => ({
  exercicioId: id, nome, padrao, series: 2, repeticoes: reps, rir: 3,
  descansoSeg: 1, justificativa: "Base",
});

const plano = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2450, proteinaG: 189, carboidratosG: 235, gordurasG: 84, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: {
    duracaoSemanas: 4, divisao: "Empurrar / Puxar / Pernas / Superior / Inferior e core",
    dias: [
      { id: "empurrar", nome: "Empurrar", diaSemana: "segunda", exercicios: [
        ex("supino-reto-barra", "Supino reto com barra", "empurrar-horizontal", "6–10"),
        ex("desenvolvimento-halteres", "Desenvolvimento com halteres", "empurrar-vertical", "6–10"),
        ex("elevacao-lateral-halteres", "Elevação lateral com halteres", "empurrar-vertical", "10–15"),
        ex("triceps-polia", "Tríceps na polia", "empurrar-horizontal", "10–15"),
      ] },
      { id: "puxar", nome: "Puxar", diaSemana: "terca", exercicios: [ex("remada-curvada", "Remada curvada", "puxar-horizontal", "6–10")] },
    ],
  },
} as unknown as PlanoGerado;

/**
 * Regressão do rodapé coberto: com conteúdo mais alto que a viewport, o
 * scroll saía para o body e a `BottomNav` (então `sticky`) descia junto,
 * ficando atrás da barra do navegador. A checagem é geométrica: a nav
 * precisa terminar dentro de `innerHeight` em qualquer posição de rolagem.
 */
async function navDentroDaViewport(page: import("@playwright/test").Page, etapa: string) {
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav, etapa).toBeVisible();
  const caixa = (await nav.boundingBox())!;
  const altura = await page.evaluate(() => window.innerHeight);
  expect(caixa.y + caixa.height, `${etapa}: nav termina fora da viewport`).toBeLessThanOrEqual(altura + 1);
  // e o body não deve rolar: a rolagem pertence ao <main>
  const bodyRola = await page.evaluate(
    () => document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
  );
  expect(bodyRola, `${etapa}: o documento inteiro rola`).toBeLessThanOrEqual(1);
}

// O cenário percorre três telas e registra as 8 séries do treino, o que
// não cabe nos 30 s padrão do Playwright.
test.setTimeout(120_000);

test("a barra de navegação permanece visível nas telas com conteúdo longo", async ({ page, context }) => {
  const email = `e2e-navbar-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  // 1) Início com plano ativo (2ª imagem do relato)
  await page.goto("/inicio");
  await expect(page.getByRole("heading", { name: "Empurrar", exact: true })).toBeVisible({ timeout: 30_000 });
  await navDentroDaViewport(page, "início (topo)");
  await page.mouse.wheel(0, 2000);
  await navDentroDaViewport(page, "início (rolado)");

  // 2) Prévia do treino do dia (1ª imagem do relato)
  await page.getByRole("link", { name: /Ver treino/ }).click();
  await expect(page.getByText("4 exercícios · 8 séries")).toBeVisible();
  await navDentroDaViewport(page, "prévia do treino (topo)");
  await page.mouse.wheel(0, 2000);
  await navDentroDaViewport(page, "prévia do treino (rolado)");

  // 3) Resumo do treino concluído (3ª imagem do relato)
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByText("SESSÃO EM ANDAMENTO")).toBeVisible();
  // Cada cartão de série monta o próprio timer, então pode haver mais de um
  // diálogo montado ao mesmo tempo; fecha todos antes do próximo clique.
  const dialogos = page.getByRole("dialog", { name: "Timer de descanso" });
  const fecharTimer = async () => {
    // Fechar um diálogo desmonta e recria a lista de cartões. Trabalhar com
    // uma captura de `all()` deixa as referências seguintes obsoletas; por
    // isso buscamos novamente o primeiro diálogo a cada iteração.
    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
      const primeiro = dialogos.first();
      if (!(await primeiro.isVisible().catch(() => false))) return;
      await primeiro.getByRole("button", { name: "Fechar timer" }).click();
    }
    await expect(dialogos).toHaveCount(0);
  };

  for (const nome of ["Supino reto com barra", "Desenvolvimento com halteres", "Elevação lateral com halteres", "Tríceps na polia"]) {
    await fecharTimer();
    await page.getByRole("link", { name: `Abrir ${nome}` }).click();
    await expect(page.getByRole("heading", { name: nome, level: 2 })).toBeVisible();
    for (const serie of [1, 2]) {
      const botao = page.getByRole("button", { name: `Registrar série ${serie}` });
      await expect(botao).toBeEnabled({ timeout: 15_000 });
      await fecharTimer();
      await botao.click();
      await fecharTimer();
    }
  }
  await expect(page.getByText("8/8")).toBeVisible();
  const concluido = page.getByText("TREINO CONCLUÍDO");
  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    await fecharTimer();
    await page.getByRole("button", { name: "Concluir treino" }).click({ timeout: 5_000 }).catch(() => {});
    if (await concluido.isVisible().catch(() => false)) break;
    await page.waitForTimeout(500);
  }
  await expect(concluido).toBeVisible({ timeout: 20_000 });
  await navDentroDaViewport(page, "resumo do treino (topo)");
  await page.mouse.wheel(0, 2000);
  await navDentroDaViewport(page, "resumo do treino (rolado)");
});
