import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans, workoutSessions } from "@/db/schema";
import type { ExercicioSessao } from "@/domain/sessao/repositorio";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Evidência do card 9:16 de compartilhamento.
 *
 * O artefato julgado aqui não é uma asserção de texto: é o PNG real de
 * 1080x1920 que o componente desenha no canvas do navegador e que o
 * atleta publicaria nos Stories. Por isso o teste roda no Chromium de
 * verdade, dispara a geração pelo mesmo botão que o usuário toca e
 * grava o binário resultante em disco para inspeção manual contra a
 * referência de design.
 *
 * Conforme AGENTS.md, as evidências vão para
 * `/home/movida/Downloads/evidencias-e2e/` e ficam fora do
 * versionamento.
 */

const EVIDENCIAS = process.env.CI
  ? "test-results/evidencias-e2e"
  : "/home/movida/Downloads/evidencias-e2e";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1",
  modoConservador: false,
  perfilVersao: 1,
  dadosUsados: [],
  nutricao: {
    calorias: 2400, proteinaG: 160, carboidratosG: 300,
    gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [],
  },
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [{
      id: "segunda-a",
      nome: "Segunda-feira - A",
      diaSemana: "segunda",
      exercicios: [{
        exercicioId: "supino-halteres", nome: "Supino reto com halteres",
        padrao: "empurrar-horizontal", series: 4, repeticoes: "8–10",
        rir: 2, descansoSeg: 90, justificativa: "Base de força",
      }],
    }],
  },
};

/** Séries concluídas com carga e repetições realistas de uma sessão de verdade. */
function series(quantidade: number, cargaKg: number, repeticoes: number) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    numero: indice + 1,
    repeticoesSugeridas: "8–10",
    cargaKg,
    cargaSugeridaKg: cargaKg,
    repeticoes,
    rir: 2,
    concluida: true,
  }));
}

const exercicios: ExercicioSessao[] = [
  { exercicioId: "supino-halteres", nome: "Supino reto com halteres", descansoSeg: 90, series: series(4, 82, 10) },
  { exercicioId: "remada-curvada", nome: "Remada curvada com barra", descansoSeg: 90, series: series(4, 70, 10) },
  { exercicioId: "desenvolvimento-militar", nome: "Desenvolvimento militar", descansoSeg: 90, series: series(3, 40, 10) },
  { exercicioId: "rosca-direta", nome: "Rosca direta", descansoSeg: 60, series: series(3, 26, 12) },
];

/**
 * Semeia uma sessão já concluída e devolve a URL do resumo. Duração
 * fixa (54 min) para que a evidência seja comparável entre rodadas.
 */
async function semearSessaoConcluida(email: string, comRecordes: boolean) {
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  const [planoSalvo] = await db.insert(plans).values({
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false,
    conteudo: plano, activatedAt: new Date(),
  }).returning();

  const fim = new Date();
  const inicio = new Date(fim.getTime() - 54 * 60_000);

  // Sem recorde: uma sessão anterior mais pesada já ocupa a marca de
  // cada exercício, então `obterResumoSessao` não acha carga superada.
  if (!comRecordes) {
    await db.insert(workoutSessions).values({
      userId: user.id, planId: planoSalvo.id, diaId: "segunda-a",
      nome: "Segunda-feira - A", estado: "concluida",
      exercicios: exercicios.map((e) => ({
        ...e,
        series: series(1, (e.series[0].cargaKg ?? 0) + 10, 8),
      })),
      startedAt: new Date(inicio.getTime() - 7 * 86_400_000),
      endedAt: new Date(fim.getTime() - 7 * 86_400_000),
    });
  }

  const [sessao] = await db.insert(workoutSessions).values({
    userId: user.id, planId: planoSalvo.id, diaId: "segunda-a",
    nome: "Segunda-feira - A", estado: "concluida",
    exercicios, startedAt: inicio, endedAt: fim,
  }).returning();

  return { cookie, url: `/sessao/${sessao.id}/resumo` };
}

/**
 * Captura o PNG que o componente realmente produziu.
 *
 * Sem substituir nada do desenho: apenas envolve `URL.createObjectURL`
 * para ler o Blob que `gerarCard` entrega ao fluxo de download. O
 * caminho de `navigator.share` não existe no Chromium headless, então
 * é por aqui que o card sai — e é o mesmo binário que iria para o
 * Instagram.
 */
async function instalarCapturaDoCard(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    (window as unknown as { __cardPng?: string }).__cardPng = undefined;
    URL.createObjectURL = (objeto: Blob | MediaSource) => {
      if (objeto instanceof Blob && objeto.type === "image/png") {
        objeto.arrayBuffer().then((buffer) => {
          let binario = "";
          for (const byte of new Uint8Array(buffer)) {
            binario += String.fromCharCode(byte);
          }
          (window as unknown as { __cardPng?: string }).__cardPng = btoa(binario);
        });
      }
      return original(objeto);
    };
  });
}

/** Lê largura e altura direto do cabeçalho IHDR do PNG. */
function dimensoesPng(png: Buffer) {
  const assinatura = png.subarray(0, 8).toString("hex");
  return {
    assinatura,
    largura: png.readUInt32BE(16),
    altura: png.readUInt32BE(20),
  };
}

async function gerarEvidencia(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  cenario: "com-recordes" | "sem-recordes",
) {
  const email = `e2e-card-${cenario}-${Date.now()}@example.com`;
  const { cookie, url } = await semearSessaoConcluida(
    email,
    cenario === "com-recordes",
  );
  await context.addCookies([cookie]);
  await instalarCapturaDoCard(page);

  await page.goto(url);

  // A tela do resumo precisa estar de pé antes de gerar o card.
  await expect(page.getByRole("heading", { name: "Segunda-feira - A" })).toBeVisible();
  const botao = page.getByRole("button", { name: /Compartilhar no Instagram/ });
  await expect(botao).toBeVisible();

  await mkdir(EVIDENCIAS, { recursive: true });
  await page.screenshot({
    path: `${EVIDENCIAS}/card-compartilhamento-${cenario}-tela-resumo.png`,
    fullPage: true,
  });

  // O download programático é suprimido; a captura do Blob é o canal.
  const baixarSuprimido = page.waitForEvent("download").catch(() => null);
  await botao.click();

  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __cardPng?: string }).__cardPng ?? null),
      { message: "O card 9:16 não foi gerado pelo botão de compartilhar", timeout: 15_000 },
    )
    .not.toBeNull();
  void baixarSuprimido;

  const base64 = await page.evaluate(
    () => (window as unknown as { __cardPng?: string }).__cardPng as string,
  );
  const png = Buffer.from(base64, "base64");
  const destino = `${EVIDENCIAS}/card-compartilhamento-${cenario}-1080x1920.png`;
  await writeFile(destino, png);

  return { png, destino };
}

test("gera o card 9:16 de 1080x1920 do treino concluído e grava a evidência em PNG", async ({ page, context }) => {
  const { png, destino } = await gerarEvidencia(page, context, "com-recordes");

  const { assinatura, largura, altura } = dimensoesPng(png);
  expect(assinatura, `Arquivo não é PNG válido: ${destino}`).toBe("89504e470d0a1a0a");
  expect(largura, "O card precisa ter 1080 px de largura (Stories 9:16)").toBe(1080);
  expect(altura, "O card precisa ter 1920 px de altura (Stories 9:16)").toBe(1920);

  // Um card com a composição da referência não cabe em poucos KB: o
  // piso protege contra o canvas voltar vazio ou quase vazio sem que
  // nenhuma asserção perceba.
  expect(
    png.byteLength,
    `Card suspeito de estar vazio (${png.byteLength} bytes): ${destino}`,
  ).toBeGreaterThan(10_000);

  await expect(
    page.getByText("Card salvo. Abra o Instagram para publicar nos Stories."),
  ).toBeVisible();

  console.log(`Evidência do card 9:16 (com recordes): ${destino}`);
});

test("gera o card 9:16 também quando a sessão não bateu recorde", async ({ page, context }) => {
  const { png, destino } = await gerarEvidencia(page, context, "sem-recordes");

  const { largura, altura } = dimensoesPng(png);
  expect(largura).toBe(1080);
  expect(altura).toBe(1920);
  expect(png.byteLength).toBeGreaterThan(10_000);

  console.log(`Evidência do card 9:16 (sem recordes): ${destino}`);
});
