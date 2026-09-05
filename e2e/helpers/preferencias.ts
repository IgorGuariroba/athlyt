import { expect, type Page } from "@playwright/test";

import { aguardarHidratacao } from "./hidratacao";

/**
 * Camada de interação das preferências em `/mais`.
 *
 * O switch e o botão de salvar são o contrato com o atleta; o teste
 * narra "ligar o modo conservador", não a árvore do formulário
 * (docs/memory/e2e-sem-camada-de-interacao.md).
 */
export async function alternarModoConservador(page: Page, ligar: boolean) {
  await page.goto("/mais/modo-conservador");
  await aguardarHidratacao(page);
  const chave = page.getByRole("switch");
  if (ligar) await chave.check();
  else await chave.uncheck();
  await page.getByRole("button", { name: "Salvar preferência" }).click();
  await expect(page.getByText("Preferência salva.")).toBeVisible();
}
