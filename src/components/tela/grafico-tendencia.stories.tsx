import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GraficoTendencia } from "./grafico-tendencia";

/** Data fixa: uma série ancorada em `new Date()` mudaria o desenho a
 * cada execução e tornaria qualquer regressão visual indistinguível do
 * passar do tempo. */
const HOJE = new Date(2026, 1, 1);
const diasAtras = (dias: number) =>
  new Date(HOJE.getTime() - dias * 24 * 60 * 60 * 1000);

const SERIE_PESO = [
  { data: diasAtras(42), valor: 82.4 },
  { data: diasAtras(35), valor: 81.9 },
  { data: diasAtras(28), valor: 81.2 },
  { data: diasAtras(21), valor: 80.8 },
  { data: diasAtras(14), valor: 80.1 },
  { data: diasAtras(7), valor: 79.4 },
  { data: HOJE, valor: 78.5 },
];

const meta = {
  title: "Tela/GraficoTendencia",
  component: GraficoTendencia,
  parameters: {
    docs: {
      description: {
        component:
          "Séries comparáveis dividem o mesmo eixo; unidade e contexto temporal nunca somem.",
      },
    },
  },
  args: {
    titulo: "Peso corporal",
    unidade: "kg",
    series: [{ nome: "Tendência", valores: SERIE_PESO }],
  },
} satisfies Meta<typeof GraficoTendencia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const DuasSeries: Story = {
  args: {
    series: [
      { nome: "Tendência", valores: SERIE_PESO },
      {
        nome: "Registros",
        valores: SERIE_PESO.map((ponto, i) => ({
          ...ponto,
          valor: ponto.valor + (i % 2 === 0 ? 0.6 : -0.5),
        })),
      },
    ],
  },
};

/** Abaixo de dois pontos não há tendência a desenhar. */
export const PontoUnico: Story = {
  args: { series: [{ nome: "Tendência", valores: [{ data: HOJE, valor: 78.5 }] }] },
};
