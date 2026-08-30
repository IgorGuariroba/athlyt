import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BottomNav } from "./bottom-nav";

const meta = {
  title: "Navegação/BottomNav",
  component: BottomNav,
  parameters: {
    docs: {
      description: {
        component:
          "As 4 áreas do casco autenticado em uma bolha flutuante acima de `--safe-bottom`. As abas ocupam colunas iguais, mantendo a largura estável entre rotas. Só a área ativa revela o rótulo; as demais mantêm nome acessível e alvo de toque mínimo de 44px.",
      },
    },
  },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dieta: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dieta" } } },
};

export const Treino: Story = {
  parameters: { nextjs: { navigation: { pathname: "/treino" } } },
};

/** Rota aninhada: a aba ativa é decidida por prefixo, não por igualdade. */
export const ProgressoEmRotaAninhada: Story = {
  parameters: { nextjs: { navigation: { pathname: "/progresso/fotos" } } },
};
