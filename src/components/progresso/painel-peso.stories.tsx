import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PainelPeso } from "./painel-peso";

const meta = {
  title: "Progresso/PainelPeso",
  component: PainelPeso,
  args: {
    pesoAtualKg: 82.4,
    pesoMetaKg: 76,
    aoSalvar: () => Promise.resolve({ sucesso: "Pesos salvos." }),
  },
  parameters: {
    docs: {
      description: {
        component: "Registra uma nova medição e uma nova versão da meta de peso no mesmo cartão.",
      },
    },
  },
} satisfies Meta<typeof PainelPeso>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preenchido: Story = {};

export const PrimeiroRegistro: Story = {
  args: { pesoAtualKg: undefined, pesoMetaKg: undefined },
};
