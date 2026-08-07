import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { seedAuthenticatedSession } from "./helpers/seed-session";

const r2Configurado = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].every((nome) => process.env[nome]);
test.skip(!r2Configurado, "Cloudflare R2 real não configurado");

test("envia, lê por URL assinada e exclui foto corporal privada", async ({ page, context }) => {
  const arquivo = path.join("/tmp", `athlyt-foto-${Date.now()}.jpg`);
  await sharp({ create: { width: 400, height: 700, channels: 3, background: "#426b8a" } }).jpeg().withMetadata({ orientation: 1 }).toFile(arquivo);
  const { cookie } = await seedAuthenticatedSession(`e2e-foto-r2-${Date.now()}@example.com`);
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
