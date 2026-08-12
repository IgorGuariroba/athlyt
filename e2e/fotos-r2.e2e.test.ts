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
 * As quatro poses juntas estouravam o corpo da Server Action e a tela
 * pedia "envie em duas etapas". Hoje o cliente fatia o envio em uma
 * chamada por pose; este teste guarda esse comportamento.
 */
test("envia as quatro poses em uma única interação", async ({ page, context }) => {
  const poses = ["Frente", "Costas", "Lateral direita", "Lateral esquerda"] as const;
  const arquivos = await Promise.all(
    poses.map(async (pose, indice) => {
      const caminho = path.join("/tmp", `athlyt-foto-${indice}-${Date.now()}.jpg`);
      await sharp({ create: { width: 1400, height: 2400, channels: 3, background: "#426b8a" } })
        .jpeg({ quality: 100 })
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
    for (const { pose, caminho } of arquivos) {
      await page.getByLabel(pose, { exact: true }).setInputFiles(caminho);
    }
    await page.getByLabel(/Autorizo armazenar/).check();
    await page.getByRole("button", { name: "Enviar para storage privado" }).click();
    await expect(page.getByRole("status")).toContainText("Fotos armazenadas");
    // O overlay de dev do Next injeta um `alert` vazio: filtrar por
    // texto isola o alerta de erro da tela.
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
    for (const nome of [/Abrir frente/, /Abrir costas/, /Abrir lateral direita/, /Abrir lateral esquerda/]) {
      await expect(page.getByRole("link", { name: nome })).toHaveCount(1);
    }
    await page.getByRole("button", { name: "Excluir todas" }).click();
    await expect(page.getByRole("status")).toContainText("Todas as fotos");
  } finally {
    await Promise.all(arquivos.map(({ caminho }) => unlink(caminho).catch(() => undefined)));
  }
});
