import { expect, test } from "@playwright/test";
import { seedAuthenticatedSession, allowEmail } from "./helpers/seed-session";

/**
 * Avaliação Corporal Inicial.
 *
 * O cenário fecha o ciclo pela navegação real de volta, e não na tela de
 * sucesso: as três causas de "não persistiu" — escrita, invalidação e
 * derivação — só aparecem no retorno
 * (docs/memory/persistencia-visivel-apos-retorno.md).
 */
test.describe("Avaliação Corporal Inicial", () => {
  async function autenticar(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
  ) {
    const email = `e2e-avaliacao-${Date.now()}@example.com`;
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    await context.addCookies([cookie]);
  }

  test("voltar à etapa reencontra as medidas já registradas", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem/avaliacao-corporal/essenciais");
    await page.getByLabel("Cintura").fill("84");
    await page.getByLabel("Pescoço").fill("38");
    await page.getByLabel("Quadril").fill("98");
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/completas");

    // Volta pelo mesmo caminho que o usuário usa.
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/essenciais");
    await expect(page.getByLabel("Cintura")).toHaveValue("84");
    await expect(page.getByLabel("Pescoço")).toHaveValue("38");
    await expect(page.getByLabel("Quadril")).toHaveValue("98");

    // Regravar a mesma região mostra o valor novo, não o antigo.
    await page.getByLabel("Cintura").fill("85.5");
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/completas");
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page.getByLabel("Cintura")).toHaveValue("85.5");
  });

  test("proporções preservam o lado medido ao voltar", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem/avaliacao-corporal/completas");
    await page.getByLabel("Tórax").fill("103");
    await page.getByLabel("Braços, Direito").fill("36.5");
    await page.getByLabel("Braços, Esquerdo").fill("36");
    await page.getByRole("button", { name: "Salvar o que medi" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/gordura");

    await page.goBack();
    await expect(page.getByLabel("Tórax")).toHaveValue("103");
    // Lados são registros distintos: não podem se sobrescrever.
    await expect(page.getByLabel("Braços, Direito")).toHaveValue("36.5");
    await expect(page.getByLabel("Braços, Esquerdo")).toHaveValue("36");
  });

  test("medida digitada sobrevive a sair da tela sem salvar", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    // Queixa real: digitar uma medida e clicar em Voltar perdia o valor,
    // porque ele só existia no input até um submit que a navegação
    // cancelava. Cada campo grava sozinho ao perder o foco.
    await page.goto("/triagem/avaliacao-corporal/completas");
    await page.getByLabel("Tórax").fill("105");
    // O clique dispara blur + navegação imediatamente. Não esperamos o
    // indicador "salvo": esse é o caso de corrida vivido pelo usuário.
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/essenciais");
    await page.goto("/triagem/avaliacao-corporal/completas");
    await expect(page.getByLabel("Tórax")).toHaveValue("105");
  });

  test("uma única região essencial pode ser registrada por vez", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    // As três são obrigatórias para avançar, mas a coleta é pausarável:
    // medir só a cintura hoje precisa sobreviver à saída da tela.
    await page.goto("/triagem/avaliacao-corporal/essenciais");
    await page.getByLabel("Cintura").fill("86.5");
    await page.getByLabel("Cintura").blur();
    await expect(page.getByLabel("Medida salva")).toBeVisible();

    await page.goto("/treino");
    await page.goto("/triagem/avaliacao-corporal/essenciais");
    await expect(page.getByLabel("Cintura")).toHaveValue("86.5");
    await expect(page.getByLabel("Pescoço")).toHaveValue("");
  });

  test("autosave ignora valor implausível em vez de gravar lixo", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem/avaliacao-corporal/essenciais");
    await page.getByLabel("Pescoço").fill("4");
    await page.getByLabel("Pescoço").blur();

    await page.goto("/triagem/avaliacao-corporal/essenciais");
    await expect(page.getByLabel("Pescoço")).toHaveValue("");
  });

  test("registra gordura corporal com método e repõe ao voltar", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    await page.goto("/triagem/avaliacao-corporal/gordura");
    await expect(page.getByRole("heading", { name: "Gordura corporal" })).toBeVisible();
    await expect(page.getByText("Como foi medido?")).toBeVisible();
    await page.getByLabel("Percentual medido").fill("18.2");
    await page.getByText("Bioimpedância", { exact: true }).click();
    await page.getByText("Detalhes da medição").click();
    await page.getByLabel("Protocolo ou condições").fill("Em jejum");
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/fotos");

    await page.goBack();
    await expect(page.getByLabel("Percentual medido")).toHaveValue("18.2");
    await expect(page.getByLabel("Bioimpedância", { exact: false })).toBeChecked();
    await expect(page.getByLabel("Protocolo ou condições")).toHaveValue("Em jejum");
  });

  test("permite seguir sem medição de gordura", async ({ page, context }) => {
    await autenticar(page, context);

    await page.goto("/triagem/avaliacao-corporal/gordura");
    await page.getByRole("link", { name: "Não tenho uma medição" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/fotos");
  });

  test("valor recusado preserva as demais medidas digitadas", async ({
    page,
    context,
  }) => {
    await autenticar(page, context);

    // A validação nativa do browser não cobre um cliente adulterado; o
    // servidor precisa recusar e devolver o que já havia sido digitado.
    await page.goto(
      "/triagem/avaliacao-corporal/essenciais?erro=Informe+a+medida+em+cent%C3%ADmetros%2C+entre+10+e+250.&falhas=cintura&cintura=4&pescoco=38&quadril=98",
    );
    // O route announcer do Next também é um `alert` (vazio): filtrar
    // por texto isola o aviso da tela e mantém o seletor válido tanto
    // em dev quanto no build de produção.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }),
    ).toContainText("Informe a medida");
    await expect(page.getByLabel("Pescoço")).toHaveValue("38");
    await expect(page.getByLabel("Quadril")).toHaveValue("98");

    await page.getByLabel("Cintura").fill("84");
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page).toHaveURL("/triagem/avaliacao-corporal/completas");
  });
});
