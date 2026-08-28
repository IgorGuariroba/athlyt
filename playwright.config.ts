import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";

loadEnv({ path: ".env" });

/**
 * E2E mobile (ADR — specs/mvp-vertical.md, Testing Decisions):
 * "Testes E2E reais em navegador deverão cobrir viewport mobile e
 * serem gravados em vídeo como evidência durante validação."
 */
/**
 * `PLAYWRIGHT_BASE_URL` permite apontar a suíte para um servidor já no
 * ar em outra porta. É o que torna possível validar E2E localmente sem
 * derrubar a instância da porta 3000.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * O servidor precisa subir na porta que a suíte de fato acessa. Com a
 * porta fixa no comando, apontar `PLAYWRIGHT_BASE_URL` para outra
 * porta fazia o Playwright esperar 30 s por uma URL onde nada subiria.
 */
const porta = new URL(baseURL).port || "3000";

/**
 * `E2E_COMANDO` troca o servidor sob teste sem editar este arquivo.
 *
 * O padrão é `next start`, igual ao CI, servindo um build pronto. Já era
 * o padrão de fato lá; localmente era `next dev`, e a diferença cobrava
 * caro duas vezes. No tempo: cada rota compila na primeira visita com o
 * cronômetro do teste correndo, e a suíte caiu de 2,0 min para 52 s ao
 * trocar apenas isto (scripts/medir-e2e.sh). Na memória: a suíte varre
 * dezenas das 55+ rotas em minutos, que é o pior caso para o dev server
 * — foi assim que o `next dev` chegou a 4,4 GB e levou a máquina ao swap
 * (docs/memory/servidor-de-dev-sem-teto-de-heap.md).
 *
 * Rodar contra o mesmo modo do CI também elimina uma classe de
 * divergência dev/CI ao investigar teste intermitente
 * (docs/memory/e2e-flaky-sorteia-cenarios-diferentes.md).
 *
 * Para iterar em teste novo sem rebuildar, use
 * `E2E_COMANDO="npx next dev -p 3000"`.
 */
const comandoServidor =
  process.env.E2E_COMANDO ?? `npx next start -p ${porta}`;

/**
 * `next start` sem build falha com erro que não diz o que fazer, e o
 * sintoma chega como timeout de 30 s no health check do webServer
 * (docs/memory/e2e-trava-no-health-check-do-webserver.md). Buildar aqui
 * não serve: o build passa de um minuto e estouraria o mesmo timeout.
 * Então falhamos cedo, dizendo o comando exato.
 */
if (!process.env.E2E_COMANDO && !existsSync(".next/BUILD_ID")) {
  throw new Error(
    "E2E roda contra um build de produção, mas .next/BUILD_ID não existe.\n" +
      "Rode `npm run build` antes, ou use `E2E_COMANDO=\"npx next dev -p 3000\"`.",
  );
}

/**
 * O servidor sob teste sobe com `AUTH_URL` derivado do `baseURL`.
 *
 * Sem isto, apontar `PLAYWRIGHT_BASE_URL` para outra porta quebrava
 * todo cenário autenticado: o `AUTH_URL` do `.env` continua na 3000, o
 * Auth.js redireciona para lá e o teste, que está na 3100, recebe
 * `chrome-error://chromewebdata/`. A porta muda em um lugar só, então
 * a origem da autenticação tem que segui-la sozinha
 * (docs/memory/e2e-auth-url-local.md).
 */

export default defineConfig({
  testDir: "./e2e",
  /**
   * Sequencial por padrão. Medi 4 workers: a suíte cai para ~40 s, mas
   * de 1 a 4 testes falham de forma variável a cada rodada — os seeds
   * criam usuários distintos, porém os fluxos disputam o mesmo
   * Postgres e o mesmo servidor. Trocar 12 s por falha intermitente
   * corrói o sinal do CI, que é o único motivo de o job existir.
   * `E2E_WORKERS` mantém o experimento reproduzível sem torná-lo o
   * padrão.
   */
  fullyParallel: Boolean(process.env.E2E_WORKERS),
  workers: Number(process.env.E2E_WORKERS ?? 1),
  reporter: [["list"], ["html", { open: "never" }]],
  /**
   * 15 s, não os 5 s padrão. O runner do CI é bem mais lento que a
   * máquina local: `revisao-corporal` falhou no CI esperando o
   * scorecard que aqui aparece em 1,4 s, porque a server action que o
   * gera faz seis consultas e uma escrita antes de redirecionar. Vários
   * testes já compensavam isso com `{ timeout: 15_000 }` avulso —
   * sinal de que o padrão é curto demais para esta suíte. Elevar o
   * padrão trata a causa uma vez em vez de espalhar a exceção.
   */
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "on",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "npx tsx scripts/servidor-ia-e2e.ts",
      url: "http://127.0.0.1:4311/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `AUTH_URL=${baseURL} OPENROUTER_BASE_URL=http://127.0.0.1:4311/v1 OPENROUTER_API_KEY=athlyt-e2e ${comandoServidor}`,
      url: `${baseURL}/api/saude`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
