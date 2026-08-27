import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

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
 * O padrão é `next dev` porque localmente o ciclo de escrever teste e
 * rodar de novo não deve exigir build a cada alteração. O CI passa
 * `npx next start`, servindo o build que o job `build` já produziu: em
 * dev cada rota compila na primeira visita com o cronômetro do teste
 * correndo, e a suíte inteira caiu de 2,0 min para 52 s ao trocar
 * apenas isto (scripts/medir-e2e.sh).
 */
const comandoServidor =
  process.env.E2E_COMANDO ?? `npx next dev -p ${porta}`;

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
