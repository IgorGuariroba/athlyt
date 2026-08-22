import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CompartilharResultado } from "./compartilhar-resultado";

const meta = {
  title: "Tela/CompartilharResultado",
  component: CompartilharResultado,
  parameters: {
    docs: {
      description: {
        component:
          "Ação compacta para compartilhar o resultado do treino nos Stories. O card 9:16 é desenhado em canvas e compartilhado por `navigator.share`; a interface exibe somente o ícone.",
      },
    },
  },
  args: {
    nome: "Segunda-feira — A",
    duracaoMin: 54,
    totalSeries: 18,
    volumeKg: 8760,
    recordes: [{ nome: "Supino reto com halteres", valor: 82 }],
    exercicios: [
      { nome: "Supino reto com halteres" },
      { nome: "Remada curvada" },
    ],
  },
} satisfies Meta<typeof CompartilharResultado>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComRecorde: Story = {};

export const SemRecorde: Story = {
  args: { recordes: [] },
};

/** Estados de interação do ícone, priorizando o feedback necessário no toque. */
export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
};

export const Focus: Story = {
  parameters: { pseudo: { focus: true } },
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
};

export const Active: Story = {
  parameters: { pseudo: { active: true } },
};
