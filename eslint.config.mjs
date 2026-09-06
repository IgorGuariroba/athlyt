// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";

// `eslint-config-next` já registra o plugin `jsx-a11y`; redeclará-lo aborta o
// ESLint com "Cannot redefine plugin". Aqui só acrescentamos as regras que
// faltam, reaproveitando o registro que veio de lá.
const regrasA11yRecomendadas = jsxA11y.configs.recommended.rules;

const eslintConfig = defineConfig([...nextVitals, ...nextTs,
// Regras que dependem do type checker. `eslint-config-next/typescript` só
// habilita as sintáticas; as type-aware são as únicas capazes de ver que uma
// Promise foi descartada, que um `any` atravessou a borda de I/O ou que uma
// condição já é impossível pelo tipo. Custam uma passada do programa
// TypeScript inteiro (lint sai de ~11s para ~26s), custo aceito de propósito.
...tseslint.configs.strictTypeChecked,
...tseslint.configs.stylisticTypeChecked,
{
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
},
{
  files: ["**/*.{ts,tsx}"],
  rules: {
    // Permite que identificadores com prefixo _ indiquem deliberadamente
    // argumentos ou variáveis não utilizados.
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    // Permite interpolação de números em template literals (IDs de rotas, calorias, métricas).
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true,
        allowBoolean: false,
        allowAny: false,
        allowNullish: false,
        allowNever: false,
      },
    ],
  },
},
// `core-web-vitals` habilita só 6 regras de jsx-a11y. O conjunto recommended
// cobre o resto — sobretudo label sem controle associado, o defeito mais
// comum nos formulários de triagem e diário.
{
  files: ["**/*.tsx"],
  rules: {
    ...regrasA11yRecomendadas,
    // Deprecated no próprio plugin e redundante com
    // `label-has-associated-control`: gerava 38 achados sobrepostos.
    "jsx-a11y/label-has-for": "off",
    // Permite arrow functions concisas em callbacks JSX (ex.: onClick={() => setAberto(true)})
    // e o operador void explícito para descarte intencional de Promises.
    "@typescript-eslint/no-confusing-void-expression": [
      "error",
      {
        ignoreArrowShorthand: true,
        ignoreVoidOperator: true,
      },
    ],
    // Permite que regiões roláveis e o container principal recebam foco de
    // teclado para rolagem acessível com setas e leitores de tela.
    "jsx-a11y/no-noninteractive-tabindex": [
      "error",
      {
        roles: ["region", "tabpanel"],
        tags: ["main"],
      },
    ],
    // Reconhece nossos componentes de UI como controles e aceita tanto
    // htmlFor apontando para o controle quanto aninhamento dentro do label.
    "jsx-a11y/label-has-associated-control": [
      "error",
      {
        controlComponents: ["Input", "Textarea"],
        assert: "either",
        depth: 25,
      },
    ],
  },
},
{
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
  // Artefatos do Playwright (já no .gitignore). O relatório HTML
   // embute bundles minificados que o lint tenta analisar como
   // fonte, afogando erros reais em milhares de falsos positivos.
  "playwright-report/**",
  "test-results/**",
  // Galeria estática gerada por `npm run storybook:build` (já no
  // .gitignore). Mesmo caso do relatório do Playwright: são bundles
  // minificados que o lint tentaria analisar como fonte.
  "storybook-static/**",
]),
// Em arquivos de teste e E2E:
// 1. Os matchers assimétricos do vitest são tipados como `any` no próprio
//    vitest (`objectContaining<T> => any`, `stringContaining => any`), então
//    qualquer `expect.any(...)` dentro de um matcher vira
//    `no-unsafe-assignment` inevitável — limite da tipagem da ferramenta.
// 2. Asserções não-nulas (`!`) são idiomáticas em testes para expressar
//    precondição que deve falhar ruidosamente o teste caso ausente
//    (ex.: boundingBox do Playwright, primeiro item de array mockado).
// No código de produção (`src/**`), ambas permanecem estritamente ativas.
{
  files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**/*.ts"],
  rules: {
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
},
// Arquivos de configuração em JS puro não estão no `tsconfig.json`; sem isso o
// `projectService` falha ao tentar carregar um programa para eles.
{
  files: ["**/*.{js,mjs,cjs}"],
  extends: [tseslint.configs.disableTypeChecked],
},
...storybook.configs["flat/recommended"]]);

export default eslintConfig;
