import { expect, test } from "@playwright/test";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Numa tela longa, o aviso de erro no topo do formulário nasce fora da
 * dobra do botão: o usuário toca em enviar, nada muda no campo de
 * visão e conclui que o botão não funciona. O aviso precisa chegar a
 * ele sem rolagem manual.
 */
test("mostra o erro de envio sem exigir rolagem até o topo", async ({ page, context }) => {
  const email = `e2e-foto-aviso-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie } = await seedAuthenticatedSession(email);
  await context.addCookies([cookie]);

  await page.goto("/triagem/avaliacao-corporal/fotos");
  const botao = page.getByRole("button", { name: "Enviar para storage privado" });
  await botao.scrollIntoViewIfNeeded();
  await page.getByLabel(/Autorizo armazenar/).check();
  // Sem nenhuma foto escolhida o envio falha na validação do cliente:
  // basta para observar onde o aviso aparece.
  await botao.click();

  const aviso = page.getByRole("alert").filter({ hasText: "Selecione ao menos uma foto." });
  await expect(aviso).toBeVisible();
  await expect(aviso).toBeInViewport();
});
