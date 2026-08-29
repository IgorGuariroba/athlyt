import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [] },
  nutricao: {
    calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 24,
    estrategia: "Manutenção",
    refeicoes: [
      { nome: "Café da manhã", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Aveia 60 g"] },
      { nome: "Almoço", percentual: 35, calorias: 840, proteinaG: 56, itens: ["Arroz 150 g"] },
      { nome: "Jantar", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Batata 250 g"] },
      { nome: "Lanche", percentual: 15, calorias: 360, proteinaG: 24, itens: ["Fruta 1 un"] },
    ],
  },
};

test("busca, monta o Prato e registra consumo fora do plano", async ({ page, context }) => {
  const email = `e2e-atalhos-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/diario");
  const macros = page.getByRole("region", { name: "Macros do dia" });
  await expect(macros.getByText("0/2400")).toBeVisible();

  // Botão + abre o painel de Atalhos de Registro (tela 050).
  await page.getByRole("link", { name: "Registrar buscando alimento" }).click();
  await expect(page.getByRole("navigation", { name: "Atalhos de Registro" })).toBeVisible();

  // Busca na base com proveniência visível por alimento (tela 051).
  await page.getByLabel("Buscar alimento").fill("arroz");
  const resultado = page.getByRole("button", { name: /Arroz branco cozido/ });
  await expect(resultado).toBeVisible();
  await expect(page.getByText(/TBCA/).first()).toBeVisible();
  await resultado.click();

  // Porção em unidade caseira, com prévia antes de adicionar.
  await page.getByLabel("Unidade de Arroz branco cozido").selectOption("escumadeira");
  await page.getByLabel("Quantidade de Arroz branco cozido").fill("2");
  await page.getByRole("button", { name: "Adicionar ao Prato" }).click();

  // Prato acumula com subtotal (tela 058): 2 escumadeiras = 200 g = 256 kcal.
  const prato = page.getByRole("region", { name: "Prato" });
  await expect(prato.getByText("Prato (1)")).toBeVisible();
  await expect(prato.getByLabel("Subtotal do Prato: 256 kcal")).toBeVisible();

  // Segundo item pela entrada manual (tela 052), marcado como estimativa.
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByLabel("Nome do alimento").fill("Marmita da firma");
  await page.getByLabel("Energia (kcal)").fill("400");
  await page.getByLabel("Proteína (g)").fill("30");
  await page.getByRole("button", { name: "Adicionar ao Prato" }).click();
  await expect(prato.getByText("Prato (2)")).toBeVisible();
  await expect(prato.getByLabel("Subtotal do Prato: 656 kcal")).toBeVisible();
  await expect(prato.getByText(/Estimativa/).first()).toBeVisible();

  // Registra tudo de uma vez e volta ao Diário com os macros atualizados.
  await prato.getByLabel("Nome da refeição").fill("Almoço na rua");
  await prato.getByRole("button", { name: "Registrar" }).click();

  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(page.getByText("Almoço na rua")).toBeVisible();
  await expect(macros.getByText(/Energia: 656 de 2400 kcal consumidos, restam 1744 kcal/)).toBeVisible();

  // Registro avulso não consome uma Entrada Planejada.
  const linha = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(linha.getByText("Planejada")).toHaveCount(4);

  // Persistência visível após voltar por navegação real.
  await page.goto("/treino");
  await page.getByRole("link", { name: "Dieta" }).click();
  await expect(macros.getByText("656/2400")).toBeVisible();
  await expect(page.getByText("Almoço na rua")).toBeVisible();
});

test("favorito salvo reaparece na aba Favoritos e recorrente vira atalho", async ({ page, context }) => {
  const email = `e2e-favoritos-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/diario/registrar");

  // Favoritos começa vazio e diz como preencher (tela 053).
  await page.getByRole("button", { name: "Favoritos" }).click();
  await expect(page.getByText(/Nenhum favorito ainda/)).toBeVisible();

  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByLabel("Buscar alimento").fill("banana");
  await page.getByRole("button", { name: /Banana prata/ }).click();
  await page.getByRole("button", { name: "Favoritar Banana prata" }).click();

  await page.getByRole("button", { name: "Favoritos" }).click();
  await expect(page.getByRole("button", { name: /Banana prata/ })).toBeVisible();

  // Registrar um alimento faz dele um recorrente sugerido na busca vazia.
  await page.getByRole("button", { name: /Banana prata/ }).click();
  await page.getByRole("button", { name: "Adicionar ao Prato" }).click();
  const prato = page.getByRole("region", { name: "Prato" });
  await prato.getByLabel("Nome da refeição").fill("Lanche");
  await prato.getByRole("button", { name: "Registrar" }).click();

  await page.getByRole("link", { name: "Registrar buscando alimento" }).click();
  await expect(page.getByRole("region", { name: "Recorrentes" })).toBeVisible();
  await expect(page.getByText(/1× nos últimos registros/)).toBeVisible();
});

test("alimento criado na entrada manual fica reutilizável nos Favoritos", async ({ page, context }) => {
  const email = `e2e-proprio-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/diario/registrar");
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByLabel("Nome do alimento").fill("Marmita da firma");
  await page.getByLabel("Energia (kcal)").fill("700");
  await page.getByLabel("Proteína (g)").fill("40");
  await page.getByRole("button", { name: "Salvar como meu alimento" }).click();

  // Salvo uma vez, reutilizável com um toque — sem redigitar macros.
  await page.getByRole("button", { name: "Favoritos" }).click();
  const salvo = page.getByRole("button", { name: /Marmita da firma/ });
  await expect(salvo).toBeVisible();
  await expect(page.getByText(/seu alimento/)).toBeVisible();

  await salvo.click();
  const prato = page.getByRole("region", { name: "Prato" });
  await expect(prato.getByText("Prato (1)")).toBeVisible();
  await expect(prato.getByLabel("Subtotal do Prato: 700 kcal")).toBeVisible();
  // Entrada do usuário continua marcada como estimativa (user story 59).
  await expect(prato.getByText(/Estimativa/)).toBeVisible();
});
