import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartaoLista } from "./cartao-lista";
import {
  calcularDeltaTendencia,
  LinhaTempoProgresso,
  SeloVariacao,
  SparklineTendencia,
} from "./indicadores-tendencia";

/** Data fixa — ver nota em `grafico-tendencia.stories.tsx`. */
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
  title: "Tela/IndicadoresTendencia",
  component: SparklineTendencia,
  parameters: {
    docs: {
      description: {
        component:
          "Sparkline apoia uma métrica já escrita; o selo sempre explicita direção, magnitude e janela — sem julgar por cor.",
      },
    },
  },
  args: { serie: SERIE_PESO, className: "h-14" },
} satisfies Meta<typeof SparklineTendencia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sparkline: Story = {};

export const MetricaCompleta: Story = {
  render: () => (
    <CartaoLista className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label-lg text-on-surface-strong">
          Peso de tendência
        </span>
        <SeloVariacao
          delta={calcularDeltaTendencia(SERIE_PESO)}
          unidade="kg"
          porSemana
        />
      </div>
      <SparklineTendencia
        serie={SERIE_PESO}
        cor="text-nutrition-calories"
        className="h-14"
      />
    </CartaoLista>
  ),
};

export const Selos: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <SeloVariacao
        delta={calcularDeltaTendencia(SERIE_PESO)}
        unidade="kg"
        porSemana
      />
      <SeloVariacao
        delta={calcularDeltaTendencia([...SERIE_PESO].reverse())}
        unidade="kg"
      />
      {/* Série curta demais para uma tendência: o selo trata o nulo. */}
      <SeloVariacao delta={null} unidade="kg" />
    </div>
  ),
};

export const LinhaDoTempo: Story = {
  render: () => (
    <CartaoLista className="px-2 py-2">
      <LinhaTempoProgresso
        eventos={[
          { data: HOJE, titulo: "Peso", detalhe: "78,5 kg" },
          { data: diasAtras(7), titulo: "Cintura", detalhe: "82,1 cm" },
          { data: diasAtras(21), titulo: "Foto de progresso", detalhe: "3 fotos" },
        ]}
      />
    </CartaoLista>
  ),
};
