import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PainelGraficoPeso } from "./painel-grafico-peso";

/** Datas fixas: uma série ancorada em `new Date()` redesenharia o
 * gráfico a cada execução. */
const INICIO = new Date(2026, 0, 1);
const DIA = 24 * 60 * 60 * 1000;
const noDia = (dias: number, pesoKg: number) => ({
  data: new Date(INICIO.getTime() + dias * DIA),
  pesoKg,
});

const SERIE = [
  noDia(0, 90),
  noDia(7, 89.1),
  noDia(14, 88.4),
  noDia(21, 88.6),
  noDia(28, 87.5),
  noDia(45, 86.2),
  noDia(60, 85.4),
];

const meta = {
  title: "Progresso/PainelGraficoPeso",
  component: PainelGraficoPeso,
  parameters: {
    docs: {
      description: {
        component:
          "Filtro de período acima do cartão do gráfico. Trocar o recorte é zoom, não outro plano: a inclinação da meta não muda. O estado é local — o período não vai à URL nem ao servidor.",
      },
    },
  },
  args: {
    medicoes: SERIE,
    pesoMetaKg: 78,
    agora: noDia(60, 0).data,
    horizonteInicial: 120,
  },
} satisfies Meta<typeof PainelGraficoPeso>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlanoCompleto: Story = {};

export const PrimeirosTrintaDias: Story = {
  args: { horizonteInicial: 30 },
};

/** Sem peso algum, o filtro não é oferecido: não há o que recortar. */
export const SemRegistros: Story = {
  args: { medicoes: [] },
};
