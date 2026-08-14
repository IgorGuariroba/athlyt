import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/design/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/ui/card",
              importNames: ["Card"],
              message:
                "Páginas devem usar composições de @/components/tela. Se não houver uma adequada, crie-a, exponha-a no catálogo e em /design.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Service worker gerado pelo Serwist em build de produção (ver
    // next.config.ts) — não é código-fonte do projeto.
    "public/sw.js",
    // Artefatos do Playwright (já no .gitignore). O relatório HTML
     // embute bundles minificados que o lint tenta analisar como
     // fonte, afogando erros reais em milhares de falsos positivos.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
