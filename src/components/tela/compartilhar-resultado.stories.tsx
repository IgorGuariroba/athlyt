import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CompartilharResultado } from "./compartilhar-resultado";

const meta = {
  title: "Tela/CompartilharResultado",
  component: CompartilharResultado,
  parameters: {
    docs: {
      description: {
        component:
          "Prévia do card 9:16 usado para publicar o treino concluído nos Stories. O card final é desenhado em canvas e compartilhado por `navigator.share`; a prévia repete a mesma composição em escala reduzida.",
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
