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
  test("boas-vindas mostra o único ponto de entrada", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Athlyt" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar com Google" }),
    ).toBeVisible();
  });

  test("sessão autenticada e autorizada acessa o casco de 4 abas", async ({
    page,
    context,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    await context.addCookies([cookie]);

    await page.goto("/inicio");
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();

    for (const aba of ["Início", "Diário", "Progresso", "Mais"]) {
      await expect(page.getByRole("link", { name: aba })).toBeVisible();
    }

    await page.getByRole("link", { name: "Diário" }).click();
    await expect(page.getByRole("heading", { name: "Diário" })).toBeVisible();

    await page.getByRole("link", { name: "Progresso" }).click();
    await expect(
      page.getByRole("heading", { name: "Progresso" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Mais" }).click();
    await expect(page.getByRole("heading", { name: "Mais" })).toBeVisible();
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

    await page.goto("/inicio");
    await page.getByRole("button", { name: "Sair" }).click();

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
    await outraPagina.goto("/inicio");
    await expect(
      outraPagina.getByRole("heading", { name: "Início" }),
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
