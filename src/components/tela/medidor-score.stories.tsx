import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MedidorScore } from "./medidor-score";

const meta = {
  title: "Tela/MedidorScore",
  component: MedidorScore,
  parameters: {
    docs: {
      description: {
        component:
          "A cor não classifica o resultado: pintar de vermelho um score baixo adicionaria julgamento que o produto não faz.",
      },
    },
  },
  args: { rotulo: "Aderência", valor: 86 },
} satisfies Meta<typeof MedidorScore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Faixa: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <MedidorScore rotulo="Aderência" valor={86} />
      <MedidorScore rotulo="Desempenho" valor={62} />
      <MedidorScore rotulo="Recuperação" valor={34} />
    </div>
  ),
};

export const MaximoPersonalizado: Story = {
  args: { rotulo: "Sessões da semana", valor: 4, maximo: 5 },
};
