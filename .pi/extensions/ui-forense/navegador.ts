/**
 * Sessão de navegador de vida longa, compartilhada pelas ferramentas.
 *
 * Abrir Chromium custa ~1s e semear sessão autenticada custa um INSERT:
 * pagar isso a cada chamada tornaria a inspeção cara o bastante para o
 * agente evitá-la — e uma ferramenta forense que não se usa não serve.
 *
 * A criação é preguiçosa (nunca no load da extensão, conforme
 * docs/extensions.md > Long-lived resources and shutdown) e o
 * fechamento é idempotente, porque `session_shutdown` pode chegar
 * depois de um erro que já derrubou o navegador.
 */

import { spawnSync } from "node:child_process";
import type { Browser, BrowserContext, Page } from "playwright";

import { scriptObservadorDeShift } from "./coleta";
import type { Viewport } from "./tipos";

/** iPhone 14 — mesma métrica de scripts/auditoria-visual.ts. */
export const VIEWPORT_PADRAO: Viewport = { largura: 390, altura: 844 };

export const VIEWPORTS_NOMEADOS: Record<string, Viewport> = {
  "mobile-pequeno": { largura: 320, altura: 568 },
  mobile: { largura: 390, altura: 844 },
  "mobile-grande": { largura: 430, altura: 932 },
  tablet: { largura: 768, altura: 1024 },
  desktop: { largura: 1440, altura: 900 },
};

export type SessaoNavegador = {
  navegador: Browser;
  contexto: BrowserContext;
  pagina: Page;
  viewport: Viewport;
  email: string;
  /** Erros de console acumulados desde a abertura. */
  console: string[];
};

let sessao: SessaoNavegador | null = null;

export function baseUrl(): string {
  return process.env.UI_FORENSE_BASE_URL ?? process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
}

/**
 * Semeia a sessão autenticada num subprocesso `tsx`.
 *
 * O helper de E2E importa `@/db/client`, que depende dos aliases do
 * tsconfig e do `.env` — nada disso existe no runtime da extensão. Em
 * vez de duplicar a lógica de cookie (que caducaria em silêncio na
 * próxima mudança do adapter), reusa-se `e2e/helpers/seed-session.ts`
 * pelo mesmo caminho que os testes usam.
 */
export function semearSessao(cwd: string, email: string) {
  const script = `
    import "./scripts/carregar-env";
    import { seedAuthenticatedSession, allowEmail } from "./e2e/helpers/seed-session";
    const email = process.argv[2];
    await allowEmail(email);
    const { cookie } = await seedAuthenticatedSession(email);
    console.log("__COOKIE__" + JSON.stringify(cookie));
    process.exit(0);
  `;

  const resultado = spawnSync(
    "npx",
    ["tsx", "--eval", script, "--", email],
    { cwd, encoding: "utf8", timeout: 60_000 },
  );

  const linha = (resultado.stdout ?? "")
    .split("\n")
    .find((l) => l.startsWith("__COOKIE__"));
  if (!linha) {
    throw new Error(
      `Falha ao semear sessão autenticada. Verifique se o banco está no ar (npm run db:up).\n${
        resultado.stderr?.slice(-800) ?? ""
      }`,
    );
  }
  return JSON.parse(linha.slice("__COOKIE__".length)) as Parameters<
    BrowserContext["addCookies"]
  >[0][number];
}

export async function obterSessao(
  cwd: string,
  viewport: Viewport = VIEWPORT_PADRAO,
  autenticar = true,
): Promise<SessaoNavegador> {
  if (sessao && iguais(sessao.viewport, viewport)) return sessao;
  if (sessao) await fecharSessao();

  const { chromium } = await import("playwright");
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: viewport.largura, height: viewport.altura },
    deviceScaleFactor: 2,
    // Emula toque: `hover` em desktop esconde estados que só o dedo
    // encontra, e o produto é mobile-first.
    hasTouch: true,
    isMobile: true,
  });

  const email = `ui-forense-${Date.now()}@example.com`;
  if (autenticar) {
    await contexto.addCookies([semearSessao(cwd, email)]);
  }

  await contexto.addInitScript(`(${scriptObservadorDeShift})()`);
  const pagina = await contexto.newPage();

  const erros: string[] = [];
  pagina.on("console", (msg) => {
    if (msg.type() === "error") erros.push(msg.text().slice(0, 300));
  });
  pagina.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message.slice(0, 300)}`));

  sessao = { navegador, contexto, pagina, viewport, email, console: erros };
  return sessao;
}

export function sessaoAtual(): SessaoNavegador | null {
  return sessao;
}

/** Idempotente: pode ser chamada em shutdown após o navegador já cair. */
export async function fecharSessao(): Promise<void> {
  const atual = sessao;
  sessao = null;
  if (!atual) return;
  try {
    await atual.navegador.close();
  } catch {
    // Navegador já encerrado — nada a fazer.
  }
}

export function resolverViewport(nome?: string): Viewport {
  if (!nome) return VIEWPORT_PADRAO;
  const conhecido = VIEWPORTS_NOMEADOS[nome];
  if (conhecido) return conhecido;
  const par = /^(\d+)x(\d+)$/.exec(nome);
  if (par) return { largura: Number(par[1]), altura: Number(par[2]) };
  return VIEWPORT_PADRAO;
}

function iguais(a: Viewport, b: Viewport) {
  return a.largura === b.largura && a.altura === b.altura;
}
