import { test, expect } from "@playwright/test";
import { seedAuthenticatedSession, allowEmail } from "./helpers/seed-session";

/**
 * Jornada da Triagem em cascata (specs/mvp-vertical.md, user stories
 * 5, 6, 14, 15; Testing Decisions > "perfil insuficiente ativa Modo
 * Conservador; completar dados habilita capacidades"). Cobre a
 * cascata completa até o resumo, retomada após abandono e a
 * fronteira Conservador/completo observada no Início.
 */
test.describe("Triagem em cascata", () => {
  async function autenticar(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
    const email = `e2e-triagem-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    await context.addCookies([cookie]);
  }

  test("completa a cascata obrigatória e sai do Modo Conservador", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem");
    await expect(page.getByRole("heading", { name: "Vamos começar" })).toBeVisible();
    await page.getByRole("link", { name: "Começar" }).click();
    await expect(page).toHaveURL("/triagem/idade");

    // Na primeira etapa, Voltar retorna à introdução sem sair da triagem.
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/triagem");
    await expect(page.getByRole("heading", { name: "Vamos começar" })).toBeVisible();
    await page.getByRole("link", { name: "Começar" }).click();

    await page.getByLabel("Data de nascimento").fill("1994-05-01");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/sexo");
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page.getByLabel("Data de nascimento")).toHaveValue("1994-05-01");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/sexo");
    await page.getByText("Masculino").click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/altura");
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page.getByRole("radio", { name: "Masculino" })).toBeChecked();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/altura");
    const seletorAltura = page.getByRole("slider", { name: "Altura" });
    await seletorAltura.focus();
    await seletorAltura.press("ArrowUp");
    await seletorAltura.press("ArrowUp");
    await seletorAltura.press("ArrowUp");
    await expect(seletorAltura).toHaveAttribute("aria-valuenow", "178");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/peso");
    const seletorPeso = page.getByRole("slider", {
      name: "Peso em quilogramas",
    });
    await seletorPeso.focus();
    for (let incremento = 0; incremento < 70; incremento += 1) {
      await seletorPeso.press("ArrowRight");
    }
    await expect(seletorPeso).toHaveAttribute("aria-valuenow", "82");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/objetivo");

    // O retorno restaura também controles customizados, como a régua de peso.
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/triagem/peso");
    await expect(
      page.getByRole("slider", { name: "Peso em quilogramas" }),
    ).toHaveAttribute("aria-valuenow", "82");
    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByText("Recomposição corporal").click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/experiencia");
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(
      page.getByRole("radio", { name: /Recomposição corporal/ }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/experiencia");
    await page.getByText("Intermediário", { exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/disponibilidade");
    await page.getByText("Segunda", { exact: true }).click();
    await page.getByText("Quarta", { exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/duracao-sessao");
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page.getByRole("checkbox", { name: "Segunda" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Quarta" })).toBeChecked();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/duracao-sessao");
    await page.getByText("60 minutos").click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/academia-equipamentos");
    // Escolher o local pré-marca os equipamentos plausíveis; a lista só
    // aparece depois dessa escolha (specs/workflow/telas/018).
    await page.getByText("Academia completa").click();
    await expect(page.getByRole("checkbox", { name: "Leg press" })).toBeChecked();
    // A revisão manual continua soberana sobre a sugestão.
    await page.getByRole("checkbox", { name: "Leg press" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Leg press" }),
    ).not.toBeChecked();
    // O catálogo é um atalho, não uma lista fechada: a academia pode
    // possuir equipamentos que o produto ainda não conhece.
    await page
      .getByRole("textbox", { name: "Nome do equipamento" })
      .fill("Belt squat pendular");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Belt squat pendular")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // A partir daqui as etapas são complementares — pular para o resumo
    // pulando as respostas ainda é permitido pelo teste ir direto à URL,
    // mas a jornada real do produto passa por elas; simulamos aqui só
    // a etapa de saúde (opcional, deixando em branco) para não alongar
    // o teste com todas as complementares.
    await expect(page).toHaveURL("/triagem/saude-lesoes");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/saude-condicoes");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/alimentacao-restricoes");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/alimentacao-logistica");
    await page.getByText("Médio", { exact: true }).click();
    await page.getByLabel("Tempo de preparo por refeição (minutos)").fill("30");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/rotina-sono");
    await page.getByText("Moderado", { exact: true }).click();
    await page.getByLabel("Horas de sono por noite").fill("7");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/resumo");
    await expect(page.getByText("Perfil completo")).toBeVisible();
    await expect(page.getByText("Modo Conservador")).not.toBeVisible();

    await page.getByRole("link", { name: "Ir para o Início" }).click();
    await expect(page).toHaveURL("/inicio");
    await expect(page.getByText("Modo Conservador")).not.toBeVisible();
  });

  test("abandonar no meio da cascata mantém o Início em Modo Conservador e permite retomar", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem/idade");
    await page.getByLabel("Data de nascimento").fill("1990-01-01");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL("/triagem/sexo");
    await page.getByText("Masculino").click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Abandona a cascata aqui (etapa "altura" pendente) e vai direto ao Início.
    await page.goto("/inicio");
    await expect(page.getByText("Modo Conservador", { exact: true })).toBeVisible();
    await expect(page.getByText("Altura")).toBeVisible();

    // Retomar a triagem volta exatamente para a próxima etapa pendente.
    await page.getByRole("link", { name: "Completar perfil" }).click();
    await expect(page).toHaveURL("/triagem/altura");
  });
});
