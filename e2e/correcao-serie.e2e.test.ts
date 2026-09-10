import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";
import { abrirTreinoDoDia, fecharTimer, iniciarTreino } from "./helpers/sessao";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [{
    id: "segunda-superior", nome: "Superior A", diaSemana: "segunda",
    exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 3, repeticoes: "8–10", rir: 2, descansoSeg: 90, justificativa: "Base" }],
  }] },
};

test("corrige carga, repetições e RIR de uma série já registrada", async ({ page, context }) => {
  const email = `e2e-correcao-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  await context.addCookies([cookie]);

  await abrirTreinoDoDia(page);
  await iniciarTreino(page);

  // O atleta erra a carga: 48 em vez de 56.
  const kg = page.locator('input[name="cargaKg"]').first();
  await kg.fill("48");
  await page.getByRole("button", { name: "Registrar série 1" }).click();
  await fecharTimer(page);
  await expect(page.getByText("10RM estimado")).toBeVisible();

  // A série registrada mostra o lápis; os campos seguem bloqueados.
  // Aguardar a sincronização assentar: o refresh que ela dispara não
  // pode colidir com a edição aberta no meio.
  await expect(page.getByText("Online")).toBeVisible();
  const kgRegistrado = page.locator('input[name="cargaKg"]').first();
  await expect(kgRegistrado).toBeDisabled();
  await page.getByRole("button", { name: "Editar série 1" }).click();
  await expect(page.getByText("Editando — confirme no ✓ para salvar")).toBeVisible();
  await expect(kgRegistrado).toBeEnabled();
  await expect(kgRegistrado).toHaveValue("48");

  await kgRegistrado.fill("56");
  const sincronizacao1 = page.waitForResponse((r) => r.url().includes("/sincronizar") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar correção da série 1" }).click();
  await sincronizacao1;

  // Correção salva: edição fecha, descanso não abre, e o servidor
  // passa a conhecer 56 kg.
  await expect(page.getByText("Editando — confirme no ✓ para salvar")).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Timer de descanso" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('input[name="cargaKg"]').first()).toHaveValue("56");
  await expect(page.getByText(/10RM estimado: 53\.2 kg/)).toBeVisible();

  // Reeditar para conferir repetições e RIR também.
  await page.getByRole("button", { name: "Editar série 1" }).click();
  await page.locator('input[name="repeticoes"]').first().fill("9");
  await page.locator('input[name="rir"]').first().fill("1");
  const sincronizacao2 = page.waitForResponse((r) => r.url().includes("/sincronizar") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar correção da série 1" }).click();
  await sincronizacao2;
  await page.reload();
  await expect(page.locator('input[name="repeticoes"]').first()).toHaveValue("9");
  await expect(page.locator('input[name="rir"]').first()).toHaveValue("1");
});
