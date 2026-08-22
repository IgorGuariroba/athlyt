import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BarraFaixa } from "./barra-faixa";

const meta = {
  title: "Tela/BarraFaixa",
  component: BarraFaixa,
  parameters: {
    docs: {
      description: {
        component:
          "Posição atual, meta e faixa ideal na mesma escala, com resumo textual para leitor de tela.",
      },
    },
  },
  args: {
    rotuloAcessivel:
      "Peso atual de 78,5 kg, meta de 76 kg, faixa ideal entre 74 e 80 kg.",
    atual: 78.5,
    min: 70,
    max: 86,
    meta: 76,
    unidade: "kg",
  },
} satisfies Meta<typeof BarraFaixa>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const AcimaDaMeta: Story = {
  args: {
    rotuloAcessivel:
      "Peso atual de 84 kg, meta de 76 kg, faixa ideal entre 74 e 80 kg.",
    atual: 84,
  },
};
