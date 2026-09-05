import type { StorybookConfig } from "@storybook/nextjs-vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * Storybook é a galeria do design system do Athlyt — o papel que a rota
 * `/design` cumpria até ser descontinuada. Uma galeria dentro do App
 * Router obrigava cada demonstração a caber num Server Component (daí
 * os invólucros `"use client"` só para segurar estado) e mantinha a
 * referência visual a um `npm run dev` do produto inteiro, com banco e
 * sessão. Aqui a demonstração vive ao lado do componente.
 *
 * Framework `nextjs-vite`, não `nextjs`: Storybook usa Vite e a
 * aplicação usa Turbopack. Os bundlers são diferentes — a galeria não
 * precisa reproduzir o pipeline de produção, precisa renderizar o
 * componente.
 */
const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "storybook-addon-pseudo-states",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  // `public/` serve as imagens que os componentes referenciam por
  // caminho absoluto (`/equipamentos/*.svg`), como no produto.
  staticDirs: ["../public"],
  async viteFinal(config) {
    // Tailwind v4 não tem arquivo de configuração: os tokens vivem em
    // `@theme` dentro de `globals.css` e só existem se o plugin
    // processar essa folha. Sem isto, toda story renderiza
    // sem `--surface`, `--on-surface` e a escala tipográfica.
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};

export default config;
