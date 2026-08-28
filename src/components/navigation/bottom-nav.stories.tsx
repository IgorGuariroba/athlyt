import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BottomNav } from "./bottom-nav";

const meta = {
  title: "Navegação/BottomNav",
  component: BottomNav,
  parameters: {
    docs: {
      description: {
        component:
          "As 4 abas do casco autenticado. A altura soma `--safe-bottom` em vez de ser fixa: com `border-box`, altura fixa mais `padding-bottom` não empurra a barra para cima — no iPhone, os 34pt do indicador de home reduziam a faixa tocada de 64pt para 30pt, abaixo do mínimo de 44pt.",
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
