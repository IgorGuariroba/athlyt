import { expect, test, type Page } from "@playwright/test";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/**
 * Regressão do app instalado na tela de início do iPhone.
 *
 * Sintoma relatado (iPhone 16 Pro Max, "Adicionar à Tela de Início"): o
 * título de cada aba aparecia atrás do relógio e da Dynamic Island, e
 * sobrava uma faixa morta sob a `BottomNav`. Os dois lados são o mesmo
 * defeito — `statusBarStyle: "black-translucent"` cedia a área da
 * status bar ao app sem que nenhuma tela consumisse o inset superior.
 *
 * Este arquivo não simula `display: standalone` (Playwright não instala
 * PWA). Ele cobre a parte verificável e que de fato regrediu: com
 * insets de sistema presentes, o casco recua do topo, a nav termina na
 * borda da viewport e o alvo tocável não encolhe.
 */

/**
 * Insets de um iPhone 16 Pro Max em retrato, em pontos CSS.
 *
 * Injetados como variável em vez de emulados: nem o Chromium do
 * Playwright (testei `Emulation.setSafeAreaInsets` — o comando não
 * existe no protocolo) nem os demais motores de teste resolvem
 * `env(safe-area-inset-*)` para outra coisa senão `0px`. Por isso
 * `src/app/globals.css` expõe `--safe-top` / `--safe-bottom`: são o
 * ponto de injeção que torna esta regressão testável.
 */
const INSET_TOP = 62;
const INSET_BOTTOM = 34;

async function aplicarInsetsDeIPhone(page: Page) {
  await page.addStyleTag({
    content: `:root{--safe-top:${INSET_TOP}px;--safe-bottom:${INSET_BOTTOM}px}`,
  });
}

async function medir(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(
      'nav[aria-label="Navegação principal"]',
    )!;
    const caixaNav = nav.getBoundingClientRect();
    const primeiraAba = nav.querySelector("a")!.getBoundingClientRect();
    const titulo = document.querySelector("h1")?.getBoundingClientRect();
    return {
      navFim: caixaNav.bottom,
      alturaAba: primeiraAba.height,
      topoDoTitulo: titulo?.top ?? 0,
      innerHeight: window.innerHeight,
      excedenteDoDocumento:
        document.scrollingElement!.scrollHeight -
        document.scrollingElement!.clientHeight,
    };
  });
}

test("o casco respeita as safe areas do iPhone instalado na tela de início", async ({
  page,
  context,
}) => {
  const email = `e2e-safearea-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie } = await seedAuthenticatedSession(email);
  await context.addCookies([cookie]);

  await page.goto("/mais");
  await expect(page.getByRole("heading", { name: "Mais" })).toBeVisible();

  const semInsets = await medir(page);
  await aplicarInsetsDeIPhone(page);
  const comInsets = await medir(page);

  // 1) O conteúdo desce pelo inset superior. Era o sintoma visível nas
  //    capturas: "Mais" e "Início" impressos sobre o relógio.
  expect(
    comInsets.topoDoTitulo - semInsets.topoDoTitulo,
    "o título não recuou pelo inset superior",
  ).toBeCloseTo(INSET_TOP, 0);

  // 2) A nav continua terminando na borda da viewport: o inset é
  //    absorvido por ela, e não convertido em faixa morta embaixo.
  expect(
    comInsets.navFim,
    "sobrou faixa vazia sob a barra de navegação",
  ).toBeCloseTo(comInsets.innerHeight, 0);

  // 3) O inset engorda a nav em vez de comer o alvo tocável. Com
  //    `h-16` fixa e `border-box`, o padding do indicador de home era
  //    descontado por dentro e a faixa tocada caía de 64pt para 30pt,
  //    abaixo do mínimo de 44pt (DESIGN.md > Accessibility).
  expect(
    comInsets.alturaAba,
    "o inset inferior encolheu o alvo tocável da aba",
  ).toBeCloseTo(semInsets.alturaAba, 0);
  expect(comInsets.alturaAba).toBeGreaterThanOrEqual(44);

  // 4) A rolagem segue pertencente ao <main> (memória
  //    docs/memory/casco-de-altura-fixa-ancora-o-rodape.md).
  expect(
    comInsets.excedenteDoDocumento,
    "o documento inteiro voltou a rolar",
  ).toBeLessThanOrEqual(1);
});

/**
 * A status bar opaca é o que mantém a geometria fechada em standalone:
 * com `black-translucent`, o iOS reporta uma viewport menor que a tela
 * e ancorada em `y = 0`, e zera os insets. Como o efeito não é
 * observável fora do iPhone, o contrato é fixado no metadado.
 */
test("a status bar do app instalado é opaca", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
  ).toHaveAttribute("content", "black");
});
