import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PorQueIsso } from "./por-que-isso";

const meta = {
  title: "Tela/PorQueIsso",
  component: PorQueIsso,
  parameters: {
    docs: {
      description: {
        component:
          "Detalhes de cálculo ficam colapsados, não escondidos: o atleta pode auditar de onde veio o número.",
      },
    },
  },
  args: {
    explicacao: {
      porque:
        "Estimei sua manutenção a partir de 80 kg, 180 cm e 35 anos, com atividade moderada.",
      dadosUsados: [
        { campo: "pesoKg", valor: "80 kg" },
        { campo: "alturaCm", valor: "180 cm" },
        { campo: "idadeAnos", valor: "35 anos" },
      ],
    },
  },
} satisfies Meta<typeof PorQueIsso>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Compacto: Story = {
  args: { compacto: true },
};

export const SemExplicacao: Story = {
  args: { explicacao: undefined },
};
