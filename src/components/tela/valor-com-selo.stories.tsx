import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
} from "./cartao-lista";
import { ValorComSelo } from "./valor-com-selo";

const meta = {
  title: "Tela/ValorComSelo",
  component: ValorComSelo,
  parameters: {
    docs: {
      description: {
        component:
          "Par selo+valor como unidade de leitura: o número sozinho não diz por que está ali, e o selo sozinho não diz quanto. Vai no slot `valor` de LinhaCartaoLista.",
      },
    },
  },
  args: { selo: "Recorde", children: "60 kg" },
} satisfies Meta<typeof ValorComSelo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recorde: Story = {};

export const Alerta: Story = {
  args: { selo: "Acima da meta", tom: "warning", children: "2 410 kcal" },
};

export const Sucesso: Story = {
  args: { selo: "Na meta", tom: "success", children: "84,5 cm" },
};

export const Neutro: Story = {
  args: { selo: "Estimado", tom: "outline", children: "37,1 cm" },
};

export const EmLinhaDeLista: Story = {
  render: (args) => (
    <CartaoLista>
      <LinhasCartaoLista>
        <LinhaCartaoLista
          titulo="Puxada na polia alta"
          meta="Maior carga registrada"
          valor={<ValorComSelo {...args} />}
        />
        <LinhaCartaoLista
          titulo="Remada unilateral com halter"
          meta="Maior carga registrada"
          valor={<ValorComSelo selo="Recorde">30 kg</ValorComSelo>}
        />
      </LinhasCartaoLista>
    </CartaoLista>
  ),
};
