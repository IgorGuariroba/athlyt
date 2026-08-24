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
      { nome: "Café da manhã", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Aveia 60 g", "Ovos 2 un"] },
      { nome: "Almoço", percentual: 35, calorias: 840, proteinaG: 56, itens: ["Arroz 150 g", "Frango 150 g"] },
      { nome: "Jantar", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Batata 250 g"],
        explicacao: { porque: "Carboidrato de digestão lenta à noite pelo seu horário de treino.", dadosUsados: [{ campo: "tempoPreparoMin", valor: "20 min" }] } },
      { nome: "Lanche", percentual: 15, calorias: 360, proteinaG: 24, itens: ["Fruta 1 un"] },
    ],
  },
};

test("prescrição, confirmação em 1 toque e edição atualizam os macros restantes", async ({ page, context }) => {
  const email = `e2e-diario-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await page.goto("/diario");
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();

  // Entradas Planejadas do Cardápio Diário, ainda sem consumo.
  const linha = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(linha.getByText("Planejada")).toHaveCount(4);
  const macros = page.getByRole("region", { name: "Macros do dia" });
  await expect(macros.getByText(/Energia: 0 de 2400 kcal consumidos, restam 2400 kcal/)).toBeVisible();
  await expect(macros.getByText(/Proteína: 0 de 160 g consumidos, restam 160 g/)).toBeVisible();

  // Confirmar em um toque vira Consumo Confirmado e desconta os macros.
  await page.getByRole("button", { name: "Comi como planejado: Almoço" }).click();
  await expect(linha.getByText("Planejada")).toHaveCount(3);
  await expect(macros.getByText(/Energia: 840 de 2400 kcal consumidos, restam 1560 kcal/)).toBeVisible();

  // Editar antes de confirmar registra consumo real distinto do planejado.
  await page.getByRole("link", { name: "Editar Jantar" }).click();
  await expect(page.getByRole("heading", { name: "Jantar" })).toBeVisible();

  // Prestes a divergir do plano: o motivo da prescrição é o dado que
  // muda a decisão, e por isso chega aberto, sem exigir toque.
  await expect(page.getByText(/Carboidrato de digestão lenta à noite/)).toBeVisible();
  await page.getByLabel("Porção de Batata 250 g", { exact: true }).fill("0.5");
  await page.getByRole("button", { name: "Confirmar consumo real" }).click();

  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(linha.getByText("Planejada")).toHaveCount(2);
  await expect(page.getByText("300 kcal a menos que o planejado (600 kcal)")).toBeVisible();
  await expect(macros.getByText(/Energia: 1140 de 2400 kcal consumidos, restam 1260 kcal/)).toBeVisible();

  // Persistência visível após voltar por navegação real ao Diário.
  await page.goto("/inicio");
  await page.getByRole("link", { name: "Diário" }).click();
  await expect(macros.getByText("1140/2400")).toBeVisible();

  // Navegar um dia para trás e voltar tem de aterrissar no mesmo dia:
  // um passo que pula uma data esconde um dia inteiro do Diário.
  const hoje = await page.getByRole("heading", { name: "Hoje" }).textContent();
  await page.getByRole("link", { name: "Dia anterior" }).click();
  await expect(page.getByRole("heading", { name: "Ontem" })).toBeVisible();
  await expect(macros.getByText("0/2400")).toBeVisible();
  await page.getByRole("link", { name: "Próximo dia" }).click();
  await expect(page.getByRole("heading", { name: "Hoje" })).toHaveText(hoje!);
  await expect(macros.getByText("1140/2400")).toBeVisible();

  // Desfazer devolve a refeição ao estado planejado.
  await page.getByRole("button", { name: "Desfazer" }).first().click();
  await expect(linha.getByText("Planejada")).toHaveCount(3);
  await expect(macros.getByText("300/2400")).toBeVisible();
});
