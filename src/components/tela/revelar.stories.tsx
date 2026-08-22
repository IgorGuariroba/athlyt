import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Ruler } from "lucide-react";

import { Revelar } from "./revelar";

const meta = {
  title: "Tela/Revelar",
  component: Revelar,
  parameters: {
    docs: {
      description: {
        component:
          "Detalhes de cálculo e ressalvas ficam colapsados, não escondidos.",
      },
    },
  },
  args: {
    rotulo: "Como este número é calculado",
    children:
      "A tendência usa média móvel exponencial sobre os registros dos últimos 14 dias, o que reduz o efeito de variação de água e conteúdo intestinal.",
  },
} satisfies Meta<typeof Revelar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fechado: Story = {};

export const Aberto: Story = {
  args: { aberto: true },
};

export const ComIcone: Story = {
  args: {
    rotulo: "Trocar exercício",
    Icone: Ruler,
    children:
      "Substituições mantêm o padrão de movimento e a faixa de repetições prescrita.",
  },
};

export const ComMeta: Story = {
  args: { meta: "14 dias", tom: "forte" },
};
