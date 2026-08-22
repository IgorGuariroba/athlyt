import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dumbbell } from "lucide-react";

import {
  CabecalhoCartaoLista,
  CartaoLista,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
} from "./cartao-lista";

const meta = {
  title: "Tela/CartaoLista",
  component: CartaoLista,
  parameters: {
    docs: {
      description: {
        component:
          "Itens homogêneos separados por divisor de 1px, métrica alinhada à direita. Cartão agrupa; divisores separam — não transforme cada linha em cartão.",
      },
    },
  },
} satisfies Meta<typeof CartaoLista>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TreinoCompleto: Story = {
  render: () => (
    <CartaoLista>
      <CabecalhoCartaoLista
        indicador={1}
        titulo="Treino A — Empurrar"
        meta="4 exercícios · 52 min estimados"
        Icone={Dumbbell}
      />
      <LinhasCartaoLista>
        <LinhaCartaoLista titulo="Supino reto" meta="Peito · barra" valor="3×8">
          <FaixaDados>72,5 kg · RIR 2 · descanso 120 s</FaixaDados>
        </LinhaCartaoLista>
        <LinhaCartaoLista
          titulo="Desenvolvimento militar"
          meta="Ombros · halteres"
          valor="3×10"
        >
          <FaixaDados>22 kg · RIR 2 · descanso 90 s</FaixaDados>
        </LinhaCartaoLista>
        <LinhaCartaoLista
          titulo="Tríceps na polia"
          meta="Tríceps · cabo"
          valor="3×12"
        />
      </LinhasCartaoLista>
    </CartaoLista>
  ),
};

export const SomenteLinhas: Story = {
  render: () => (
    <CartaoLista>
      <LinhasCartaoLista>
        <LinhaCartaoLista titulo="Peso" valor="78,5 kg" />
        <LinhaCartaoLista titulo="Cintura" valor="82,1 cm" />
        <LinhaCartaoLista titulo="Gordura corporal" valor="18,2%" />
      </LinhasCartaoLista>
    </CartaoLista>
  ),
};
