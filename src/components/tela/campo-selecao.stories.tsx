import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CampoSelecao } from "./campo-selecao";

const meta = {
  title: "Tela/CampoSelecao",
  component: CampoSelecao,
  parameters: {
    docs: {
      description: {
        component:
          "Lista fechada com a roda nativa do sistema, mas altura, superfície e chevron do produto.",
      },
    },
  },
  args: {
    id: "story-metodo",
    rotulo: "Método da medição",
    descricao:
      "Trocar de aparelho muda o número sem que o corpo tenha mudado.",
    opcoes: [
      { valor: "bioimpedancia", rotulo: "Bioimpedância" },
      { valor: "adipometro", rotulo: "Adipômetro" },
      { valor: "dexa", rotulo: "DEXA/DXA" },
    ],
  },
} satisfies Meta<typeof CampoSelecao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Compacto: Story = {
  args: {
    id: "story-periodo-filtro",
    compacto: true,
    rotulo: "Filtro compacto",
    descricao: undefined,
    opcoes: [
      { valor: "7", rotulo: "7 dias" },
      { valor: "30", rotulo: "30 dias" },
    ],
  },
};
