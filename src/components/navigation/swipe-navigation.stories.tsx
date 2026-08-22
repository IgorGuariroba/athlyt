import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SwipeNavigation } from "./swipe-navigation";

const meta = {
  title: "Navegação/SwipeNavigation",
  component: SwipeNavigation,
  parameters: {
    nextjs: { navigation: { pathname: "/inicio" } },
    docs: {
      description: {
        component:
          "Gestos horizontais trocam entre as quatro abas principais. A rolagem vertical permanece nativa e a entrada da nova tela usa a transição do sistema.",
      },
    },
  },
} satisfies Meta<typeof SwipeNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inicio: Story = {
  args: {
    children: (
      <div className="flex min-h-dvh flex-col justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-headline-md font-bold text-on-surface-strong">Início</h1>
        <p className="text-body-md text-muted-foreground">
          Deslize para a esquerda para abrir Diário.
        </p>
      </div>
    ),
  },
};
