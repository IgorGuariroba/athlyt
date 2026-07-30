import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

/**
 * Três níveis, distinguidos pelo nome do arquivo:
 *
 *   *.unit.test.ts  — lógica pura, sem infraestrutura. Roda em watch a
 *                     cada tecla e é o portão rápido do CI.
 *   *.int.test.ts   — exercita Drizzle contra um Postgres real; exige
 *                     DATABASE_URL apontando para um banco migrado.
 *   *.e2e.test.ts   — navegador real via Playwright (ver e2e/, fora do
 *                     Vitest).
 *
 * O sufixo carrega a classificação para que ela seja visível ao abrir a
 * pasta e nenhuma lista precise ser mantida à mão. Um arquivo sem
 * sufixo não é coletado por nenhum project — falha barulhenta de
 * propósito, em vez de um teste que silenciosamente nunca roda.
 */

const base = {
  setupFiles: ["./vitest.setup.ts"],
  environment: "jsdom",
  globals: false,
};

// Cada project resolve imports por conta própria: o `resolve` da raiz
// não é herdado, e sem isto o alias "@/" quebra dentro dos projects.
const resolveAlias = {
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: resolveAlias,
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: resolveAlias,
        test: {
          ...base,
          name: "unidade",
          include: ["src/**/*.unit.test.{ts,tsx}"],
        },
      },
      {
        plugins: [react()],
        resolve: resolveAlias,
        test: {
          ...base,
          name: "integracao",
          include: ["src/**/*.int.test.{ts,tsx}"],
        },
      },
    ],
  },
});
