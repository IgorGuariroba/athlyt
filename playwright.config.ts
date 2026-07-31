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
 * derrubar a instância da porta 3000 — e sem cair na armadilha do
 * `AUTH_URL` descasado (docs/memory/e2e-auth-url-local.md), já que o
 * servidor de teste sobe com o host e a porta que a suíte usa.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
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
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
