import { test, expect } from "@playwright/test";
import { seedAuthenticatedSession, allowEmail } from "./helpers/seed-session";

/**
 * Jornada completa da fronteira de acesso (specs/mvp-vertical.md,
 * user stories 1–4; Testing Decisions > autenticação testada pela
 * fronteira de acesso). Login real via Google fica fora do E2E
 * automatizado — simulamos a sessão de banco diretamente
 * (ver e2e/helpers/seed-session.ts) e exercitamos o restante da
 * jornada em navegador real, viewport mobile, com vídeo.
 */
test.describe("Acesso e casco autenticado", () => {
  test("boas-vindas mostra o único ponto de entrada", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Athlyt" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Google" }),
    ).toBeVisible();
  });

  test("sessão autenticada inicia o onboarding antes de liberar o casco", async ({
    page,
    context,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    await context.addCookies([cookie]);

    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/triagem\/idade$/);
    await expect(
      page.getByRole("heading", { name: "Qual é a sua data de nascimento?" }),
    ).toBeVisible();
  });

  test("sem sessão, rota protegida redireciona para boas-vindas", async ({
    page,
  }) => {
    await page.goto("/inicio");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Athlyt" })).toBeVisible();
  });

  test("sair encerra a sessão e volta às boas-vindas", async ({
    page,
    context,
  }) => {
    const email = `e2e-logout-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    await context.addCookies([cookie]);

    await page.goto("/mais");
    await page.getByRole("button", { name: "Sair", exact: true }).click();

    await expect(page).toHaveURL("/");
    await page.goto("/inicio");
    await expect(page).toHaveURL("/");
  });

  test("sair de todos os dispositivos invalida a sessão de outro dispositivo", async ({
    page,
    context,
    browser,
  }) => {
    const email = `e2e-logout-all-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);

    // dispositivo A: sessão atual, onde a ação será disparada
    await context.addCookies([cookie]);
    await page.goto("/mais");

    // dispositivo B: mesma sessão de banco, contexto de navegador separado
    const outroContexto = await browser.newContext();
    await outroContexto.addCookies([cookie]);
    const outraPagina = await outroContexto.newPage();
    await outraPagina.goto("/mais");
    await expect(
      outraPagina.getByRole("heading", { name: "Mais" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Sair de todos os dispositivos" })
      .click();
    await expect(page).toHaveURL("/");

    await outraPagina.goto("/inicio");
    await expect(outraPagina).toHaveURL("/");

    await outroContexto.close();
  });
});
