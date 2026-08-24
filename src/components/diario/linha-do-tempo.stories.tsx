import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartaoConsumo, CartaoSessaoDiario } from "./cartoes-diario";
import { LinhaDoTempoDiario } from "./linha-do-tempo";

const meta = {
  title: "Diário/LinhaDoTempoDiario",
  component: LinhaDoTempoDiario,
  parameters: {
    docs: {
      description: {
        component:
          "Trilho cronológico do dia. A coluna de hora tem largura fixa para que os cartões alinhem entre si; a ordem é comunicada pela lista e pela hora em texto, nunca só pelo desenho.",
      },
    },
  },
  args: {
    itens: [
      {
        id: "sessao-1",
        horaLocal: "07:29",
        conteudo: (
          <CartaoSessaoDiario nome="Pull A" estado="concluida" href="/sessao/1/resumo" />
        ),
      },
      {
        id: "consumo-1",
        horaLocal: "09:12",
        conteudo: (
          <CartaoConsumo
            nome="Café da manhã: Ovos mexidos, aveia e frutas"
            estimadoPorFoto
            macros={{ calorias: 264, proteinaG: 14, carboidratosG: 19, gordurasG: 15, fibrasG: 3 }}
          />
        ),
      },
      {
        id: "consumo-2",
        horaLocal: "12:40",
        conteudo: (
          <CartaoConsumo
            nome="Almoço"
            macros={{ calorias: 720, proteinaG: 52, carboidratosG: 78, gordurasG: 18, fibrasG: 9 }}
          />
        ),
      },
    ],
  },
} satisfies Meta<typeof LinhaDoTempoDiario>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DiaEmAndamento: Story = {};

export const EventoUnico: Story = {
  args: {
    itens: [
      {
        id: "sessao-1",
        horaLocal: "07:29",
        conteudo: (
          <CartaoSessaoDiario nome="Pull A" estado="concluida" href="/sessao/1/resumo" />
        ),
      },
    ],
  },
};
