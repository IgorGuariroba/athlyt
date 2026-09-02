import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GraficoPeso } from "./grafico-peso";

/** Datas fixas: uma série ancorada em `new Date()` redesenharia o
 * gráfico a cada execução e tornaria regressão visual indistinguível
 * do passar do tempo. */
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
  title: "Progresso/GraficoPeso",
  component: GraficoPeso,
  parameters: {
    docs: {
      description: {
        component:
          "Peso medido contra a rampa da meta. O eixo do tempo é o plano — começa no peso inicial e vai até o horizonte escolhido — e o seletor 30/90/120 é zoom, não outro plano: a inclinação da meta nunca muda.",
      },
    },
  },
  args: {
    medicoes: SERIE,
    pesoMetaKg: 78,
    agora: noDia(60, 0).data,
    horizonteInicial: 120,
  },
} satisfies Meta<typeof GraficoPeso>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlanoCompleto: Story = {};

/** Zoom nos primeiros 30 dias: mesma inclinação de meta, mais detalhe. */
export const PrimeirosTrintaDias: Story = {
  args: { horizonteInicial: 30 },
};

/** Recorte sem medições além da inicial: resta a promessa. */
export const SomenteAMeta: Story = {
  args: { medicoes: [noDia(0, 90)], agora: noDia(0, 0).data },
};

/** Prazo vencido: a rampa vira patamar e o eixo acompanha o presente. */
export const PrazoVencido: Story = {
  args: {
    medicoes: [...SERIE, noDia(120, 79.2), noDia(150, 78.6)],
    agora: noDia(150, 0).data,
  },
};

/** Sem meta definida, o gráfico ainda relata o que foi medido. */
export const SemMeta: Story = {
  args: { pesoMetaKg: undefined },
};

/** Nenhum peso registrado: sem dia 0 não há plano a desenhar. */
export const SemRegistros: Story = {
  args: { medicoes: [] },
};
