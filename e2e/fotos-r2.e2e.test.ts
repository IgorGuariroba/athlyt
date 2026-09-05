import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

const r2Configurado = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].every((nome) => process.env[nome]);
test.skip(!r2Configurado, "Cloudflare R2 real não configurado");

test("envia, lê por URL assinada e exclui foto corporal privada", async ({ page, context }) => {
  const arquivo = path.join("/tmp", `athlyt-foto-${Date.now()}.jpg`);
  await sharp({ create: { width: 400, height: 700, channels: 3, background: "#426b8a" } }).jpeg().withMetadata({ orientation: 1 }).toFile(arquivo);
  const email = `e2e-foto-r2-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie } = await seedAuthenticatedSession(email);
  await context.addCookies([cookie]);
  try {
    await page.goto("/triagem/avaliacao-corporal/fotos");
    await page.getByLabel("Frente").setInputFiles(arquivo);
    await page.getByLabel(/Autorizo armazenar/).check();
    await page.getByRole("button", { name: "Enviar para storage privado" }).click();
    await expect(page.getByRole("status")).toContainText("Fotos armazenadas");
    const link = page.getByRole("link", { name: /Abrir frente/ });
    await expect(link).toHaveAttribute("href", /X-Amz-Signature=/);
    const resposta = await page.request.get(await link.getAttribute("href") as string);
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()["content-type"]).toContain("image/webp");
    await page.getByRole("button", { name: "Excluir foto frente" }).click();
    await expect(page.getByRole("status")).toContainText("Foto excluída");
    await expect(page.getByRole("link", { name: /Abrir frente/ })).toHaveCount(0);
  } finally {
    await unlink(arquivo).catch(() => undefined);
  }
});

/**
 * O comportamento do aviso está fixado em unidade
 * (`src/components/tela/__tests__/aviso-acao.unit.test.tsx`). Aqui
 * interessa a integração com a tela real: com o formulário rolado até
 * o botão — como o usuário o encontra — a mensagem precisa chegar ao
 * campo de visão sem rolagem manual.
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

/**
 * As quatro poses juntas estouravam o corpo da Server Action e a tela
 * pedia "envie em duas etapas". Hoje o cliente fatia o envio em uma
 * chamada por pose; este teste guarda esse comportamento.
 */
test("envia as quatro poses em uma única interação", async ({ page, context }) => {
  const poses = ["Frente", "Costas", "Lateral direita", "Lateral esquerda"] as const;
  const arquivos = await Promise.all(
    poses.map(async (pose, indice) => {
      const caminho = path.join("/tmp", `athlyt-foto-${indice}-${Date.now()}.jpg`);
      await sharp({ create: { width: 400, height: 700, channels: 3, background: "#426b8a" } })
        .jpeg({ quality: 80 })
        .withMetadata({ orientation: 1 })
        .toFile(caminho);
      return { pose, caminho };
    }),
  );
  const email = `e2e-foto-4-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie } = await seedAuthenticatedSession(email);
  await context.addCookies([cookie]);
  try {
    await page.goto("/triagem/avaliacao-corporal/fotos");
    await expect(
      page.getByRole("heading", { name: "Comparação visual padronizada" }),
    ).toBeVisible();
    for (const { pose, caminho } of arquivos) {
      await page.getByLabel(pose, { exact: true }).setInputFiles(caminho);
    }
    await page.getByLabel(/Autorizo armazenar/).check();
    await page.getByRole("button", { name: "Enviar para storage privado" }).click();
    await expect(page).toHaveURL(
      /\/triagem\/avaliacao-corporal\/fotos\?sucesso=Fotos%20armazenadas%20de%20forma%20privada\./,
      { timeout: 30_000 },
    );
    await expect(page.getByRole("status")).toContainText("Fotos armazenadas", {
      timeout: 30_000,
    });
    // O alerta de erro da tela vive dentro de `main`. Fora dele o Next
    // mantém o route announcer, um `role="alert"` que repete o `h1`
    // quando o documento não tem título — ruído que não é erro.
    await expect(
      page.getByRole("main").getByRole("alert").filter({ hasText: /\S/ }),
    ).toHaveCount(0);
    for (const nome of [/Abrir frente/, /Abrir costas/, /Abrir lateral direita/, /Abrir lateral esquerda/]) {
      await expect(page.getByRole("link", { name: nome })).toHaveCount(1);
    }
    await page.getByRole("button", { name: "Excluir todas" }).click();
    await expect(page.getByRole("status")).toContainText("Todas as fotos");
  } finally {
    await Promise.all(arquivos.map(({ caminho }) => unlink(caminho).catch(() => undefined)));
  }
});
