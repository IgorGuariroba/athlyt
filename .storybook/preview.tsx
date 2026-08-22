import type { Preview, Decorator } from "@storybook/nextjs-vite";

import { archivo, dmSans } from "../src/app/fonts";
import "../src/app/globals.css";

/**
 * O casco mínimo que toda story precisa para ser fiel ao produto.
 *
 * `layout.tsx` faz três coisas que nenhuma story herda sozinha:
 * declara as variáveis de fonte no `<html>`, pinta o fundo com o token
 * de background e assume português. Sem isso a galeria mentiria — os
 * títulos cairiam em DM Sans (a família de marca vem por
 * `--font-archivo`) e o dark-first do produto apareceria sobre branco.
 *
 * A largura de 390px é a mesma da auditoria visual: o Athlyt é um
 * produto mobile e um componente esticado em desktop não é o
 * componente que o atleta vê.
 */
const cascoDoProduto: Decorator = (Story) => (
  <div
    lang="pt-BR"
    className={`${dmSans.variable} ${archivo.variable} bg-background text-foreground font-sans antialiased`}
  >
    <div className="mx-auto w-full max-w-[390px] p-4">
      <Story />
    </div>
  </div>
);

const preview: Preview = {
  decorators: [cascoDoProduto],
  parameters: {
    // Todo componente do produto vive sob o App Router. Sem isto,
    // qualquer um que chame `useRouter`/`usePathname` quebra com
    // "invariant expected app router to be mounted" — e como o
    // Storybook captura o erro na moldura dele, a story apareceria
    // apenas vazia, sem indicar a causa.
    nextjs: { appDirectory: true },
    // O produto não tem tema claro (DESIGN.md: "o preto é estrutural,
    // não apenas modo escuro"). Um fundo branco de fábrica faria a
    // galeria reprovar contrastes que o produto nunca exibe.
    backgrounds: {
      options: {
        athlyt: { name: "Athlyt", value: "#111111" },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // A galeria reporta as violações sem derrubar a story: o teste
      // de acessibilidade que barra entrega é o `ui_varrer` sobre a
      // tela real, onde o componente aparece no contexto que importa.
      test: "todo",
    },
  },
  initialGlobals: {
    backgrounds: { value: "athlyt" },
  },
};

export default preview;
