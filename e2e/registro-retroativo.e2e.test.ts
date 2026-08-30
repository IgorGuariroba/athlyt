import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Registro Retroativo por descrição (ADR 0002): o caminho de quem não
 * estava com o celular na hora de comer.
 *
 * O que este teste protege é a promessa do fluxo — descrever, ver a
 * estimativa, corrigir, confirmar — e as garantias que impedem a
 * estimativa de virar mentira: ela aparece marcada como estimativa,
 * mostra a descrição que a originou, nada entra no Diário antes da
 * confirmação, e substituir um consumo já registrado exige aviso
 * explícito.
 */

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

async function atletaComPlano(sufixo: string) {
  const email = `e2e-retroativo-${sufixo}-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano,
    activatedAt: new Date(),
  });
  return cookie;
}

test("descrever o que comeu registra a refeição sem foto e sem editar item a item", async ({
  page,
  context,
}) => {
  await context.addCookies([await atletaComPlano("texto")]);

  await page.goto("/diario");
  const macros = page.getByRole("region", { name: "Macros do dia" });
  await expect(macros.getByText("0/2400")).toBeVisible();

  // "Comi outra coisa" no cartão da Refeição Planejada é o ponto de
  // entrada: dia e refeição já vêm identificados.
  await page
    .getByRole("link", { name: "Comi outra coisa no lugar de Almoço" })
    .click();
  await expect(page.getByRole("heading", { name: "No lugar de Almoço" })).toBeVisible();
  await page.getByRole("link", { name: "Registrar por texto" }).click();

  await page
    .getByLabel("Descrição da refeição")
    .fill("Duas colheres de arroz, um bife médio e um copo de suco.");
  await page.getByRole("button", { name: /Estimar calorias e macros/ }).click();

  // A estimativa chega pronta, marcada como estimativa e com a
  // limitação visível antes do botão.
  await expect(page.getByRole("heading", { name: "Confira antes de registrar" })).toBeVisible();
  await expect(
    page.getByText("A quantidade de arroz foi assumida como porção usual"),
  ).toBeVisible();
  await expect(page.getByText("você descreveu: duas colheres")).toBeVisible();
  await expect(page.getByText("468 kcal", { exact: false })).toBeVisible();

  // Remover o que não foi comido recalcula o total antes de gravar.
  await page.getByRole("button", { name: "Remover Suco de laranja" }).click();
  await expect(page.getByText("378 kcal", { exact: false })).toBeVisible();

  // A descrição usada permanece auditável junto do resultado.
  await page.getByText("Descrição usada nesta estimativa").click();
  await expect(
    page.getByText("Duas colheres de arroz, um bife médio e um copo de suco."),
  ).toBeVisible();

  // Data e horário são do atleta, não do momento em que ele lembrou.
  await page.getByLabel("Horário da refeição").fill("15:45");

  // Até aqui nada entrou no Diário: a IA propõe, o atleta registra.
  await page.getByRole("button", { name: /Registrar no Diário/ }).click();
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(macros.getByText("378/2400")).toBeVisible();

  const linha = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(linha.getByText("Almoço: arroz, bife e suco")).toBeVisible();
  await expect(linha.getByText("Estimado pela sua descrição")).toBeVisible();
  await expect(linha.getByText("15:45")).toBeVisible();

  // Persistência visível depois de navegação real.
  await page.goto("/treino");
  await page.getByRole("link", { name: "Dieta" }).click();
  await expect(macros.getByText("378/2400")).toBeVisible();
});

test("corrigir o alimento avisa que os macros são de outro, e recalcular só aquele item", async ({
  page,
  context,
}) => {
  await context.addCookies([await atletaComPlano("recalculo")]);

  await page.goto("/diario/registrar/descricao");
  await page
    .getByLabel("Descrição da refeição")
    .fill("Duas colheres de arroz, um bife médio e um copo de suco.");
  await page.getByRole("button", { name: /Estimar calorias e macros/ }).click();
  await expect(page.getByRole("heading", { name: "Confira antes de registrar" })).toBeVisible();

  const total = page.getByText("Total estimado").locator("..");
  await expect(total.getByText("468 kcal", { exact: false })).toBeVisible();
  // Enquanto o alimento é o estimado, nada de aviso: corrigir a porção
  // ou o nome não pode virar cerimônia no caminho comum.
  await expect(page.getByRole("button", { name: /Recalcular/ })).toHaveCount(0);

  // "suco de laranja" → "suco de laranja zero açúcar" troca o alimento,
  // e não só o rótulo: os 90 kcal deixam de descrever o que foi bebido.
  await page.getByLabel("Alimento 3").fill("Suco de laranja zero açúcar");
  await expect(page.getByText(/Estes números são de/)).toBeVisible();
  await expect(page.getByText(/Suco de laranja”/)).toBeVisible();

  // O recálculo é explicitamente pedido, e atinge apenas aquela linha.
  await page.getByRole("button", { name: /Recalcular/ }).click();
  await expect(total.getByText("378 kcal", { exact: false })).toBeVisible();
  await expect(page.getByText(/Estes números são de/)).toHaveCount(0);

  await page.getByRole("button", { name: /Registrar no Diário/ }).click();
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();

  // O Diário recebe o nome corrigido com os números correspondentes.
  const macros = page.getByRole("region", { name: "Macros do dia" });
  await expect(macros.getByText("378/2400")).toBeVisible();
});

test("substituir um consumo já registrado exige aviso, e cancelar preserva o registro", async ({
  page,
  context,
}) => {
  await context.addCookies([await atletaComPlano("substituicao")]);

  await page.goto("/diario");
  const macros = page.getByRole("region", { name: "Macros do dia" });

  // Consumo Real já existente para o Almoço.
  await page.getByRole("button", { name: "Comi como planejado: Almoço" }).click();
  await expect(macros.getByText("840/2400")).toBeVisible();

  await page.goto("/diario/registrar/descricao?refeicao=1-Almo%C3%A7o");
  await page.getByLabel("Descrição da refeição").fill("Duas colheres de arroz e um bife.");
  await page.getByRole("button", { name: /Estimar calorias e macros/ }).click();
  await expect(page.getByRole("heading", { name: "Confira antes de registrar" })).toBeVisible();

  // O aviso chega antes da escrita e nomeia o que será perdido.
  await page.getByRole("button", { name: /Registrar no Diário/ }).click();
  const aviso = page.getByRole("alertdialog", { name: "Substituir o registro atual" });
  await expect(aviso.getByText(/840 kcal/)).toBeVisible();

  await aviso.getByRole("button", { name: "Cancelar" }).click();
  await page.goto("/diario");
  await expect(macros.getByText("840/2400")).toBeVisible();

  // Confirmando, o Consumo Real substitui o anterior em vez de somar.
  await page.goto("/diario/registrar/descricao?refeicao=1-Almo%C3%A7o");
  await page.getByLabel("Descrição da refeição").fill("Duas colheres de arroz e um bife.");
  await page.getByRole("button", { name: /Estimar calorias e macros/ }).click();
  await page.getByRole("button", { name: /Registrar no Diário/ }).click();
  await page.getByRole("button", { name: "Substituir" }).click();

  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(macros.getByText("328/2400")).toBeVisible();
  const linha = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(linha.getByText("Almoço", { exact: true })).toBeVisible();
  await expect(linha.getByText("Estimado pela sua descrição")).toBeVisible();
});
