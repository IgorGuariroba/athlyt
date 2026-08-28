import { expect, test } from "@playwright/test";
import path from "node:path";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Registro por foto: o caminho de quem não quer editar nada.
 *
 * O que este teste protege é a promessa do fluxo — fotografar, ver a
 * estimativa, confirmar — e as duas garantias que impedem a estimativa
 * de virar mentira: ela aparece marcada como estimativa (limitações e
 * confiança visíveis) e nada entra no Diário antes da confirmação.
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

test("fotografar o prato registra a refeição sem editar item por item", async ({ page, context }) => {
  const email = `e2e-foto-${Date.now()}@example.com`;
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

  // A câmera é a ação principal do Diário, e não um item escondido
  // dentro do painel de atalhos.
  await page.getByRole("link", { name: /Fotografar refeição/ }).click();
  await expect(page.getByRole("heading", { name: "Fotografe o prato" })).toBeVisible();

  // Fixture realista para validar o upload/preview. O reconhecimento continua
  // determinístico porque o provedor de IA é mockado pelo servidor E2E.
  await page.locator("input[type=file]").first().setInputFiles(
    path.join(process.cwd(), "e2e/fixtures/prato-arroz-feijao-frango.jpg"),
  );
  await expect(page.getByAltText("Prévia da foto escolhida")).toBeVisible();

  await page.getByRole("button", { name: /Estimar calorias e macros/ }).click();

  // A estimativa chega pronta: nome, itens e total, sem formulário.
  await expect(page.getByRole("heading", { name: "Confira antes de registrar" })).toBeVisible();
  await expect(page.getByLabel("Nome da refeição")).toHaveValue("Almoço: arroz, feijão e frango");
  await expect(page.getByText("488 kcal", { exact: false })).toBeVisible();

  // O que a foto não sustenta fica visível antes de confirmar.
  await expect(page.getByText("O óleo do preparo não é visível na foto")).toBeVisible();
  await expect(page.getByText(/Estimativa — pouco visível na foto/).first()).toBeVisible();

  // Corrigir a porção é o único ajuste esperado, e recalcula o total.
  await page.getByLabel(/Gramas de Arroz branco cozido/).fill("75");
  await expect(page.getByText("392 kcal", { exact: false })).toBeVisible();

  // Até aqui nada entrou no Diário: a IA propõe, o atleta registra.
  await page.getByRole("button", { name: /Registrar no Diário/ }).click();
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(macros.getByText("392/2400")).toBeVisible();

  // O consumo fica marcado como estimado: um número de foto não pode
  // se confundir com um medido na revisão do dia.
  const linha = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(linha.getByText("Almoço: arroz, feijão e frango")).toBeVisible();
  await expect(linha.getByText("Estimado por foto")).toBeVisible();

  // Persistência visível depois de navegação real.
  await page.goto("/treino");
  await page.getByRole("link", { name: "Dieta" }).click();
  await expect(macros.getByText("392/2400")).toBeVisible();
});
