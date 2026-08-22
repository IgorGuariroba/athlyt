import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ControleSegmentado } from "./controle-segmentado";

const meta = {
  title: "Tela/ControleSegmentado",
  component: ControleSegmentado,
  parameters: {
    docs: {
      description: {
        component:
          "O estado alternado vive na URL — a tela continua endereçável. Para preferência local que não deve entrar no histórico, use `SeletorSegmentado`.",
      },
    },
  },
  args: {
    rotulo: "Período do gráfico",
    opcoes: [
      { valor: "30", rotulo: "30d", href: "?periodo=30", ativo: false },
      { valor: "90", rotulo: "90d", href: "?periodo=90", ativo: true },
      { valor: "365", rotulo: "1a", href: "?periodo=365", ativo: false },
    ],
  },
} satisfies Meta<typeof ControleSegmentado>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const DuasOpcoes: Story = {
  args: {
    rotulo: "Unidade",
    opcoes: [
      { valor: "kg", rotulo: "kg", href: "?unidade=kg", ativo: true },
      { valor: "lb", rotulo: "lb", href: "?unidade=lb", ativo: false },
    ],
  },
};
