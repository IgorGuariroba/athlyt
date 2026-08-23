// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([...nextVitals, ...nextTs, {
  files: ["src/app/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@/components/ui/card",
            importNames: ["Card"],
            message:
              "Páginas devem usar composições de @/components/tela. Se não houver uma adequada, crie-a, exponha-a no catálogo e demonstre-a em uma story ao lado do componente.",
          },
        ],
      },
    ],
  },
}, // Override default ignores of eslint-config-next.
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
  // Galeria estática gerada por `npm run storybook:build` (já no
  // .gitignore). Mesmo caso do relatório do Playwright: são bundles
  // minificados que o lint tentaria analisar como fonte.
  "storybook-static/**",
]), ...storybook.configs["flat/recommended"]]);

export default eslintConfig;
