import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { SeletorHorizonte } from "./seletor-horizonte";
import type { HorizonteDias } from "@/domain/medicoes/plano-peso";

const meta = {
  title: "Progresso/SeletorHorizonte",
  component: SeletorHorizonte,
  parameters: {
    docs: {
      description: {
        component:
          "Recorte de 30, 90 ou 120 dias do gráfico de peso. Rótulo visual só com o número, para caber em três segmentos numa tela de 390px; a unidade vai no nome acessível.",
      },
    },
  },
  args: { valor: 30, aoMudar: () => {} },
} satisfies Meta<typeof SeletorHorizonte>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TrintaDias: Story = {};

export const CentoEVinteDias: Story = {
  args: { valor: 120 },
};

/** Interativo: demonstra a troca de segmento com estado real. */
export const Interativo: Story = {
  render: function Interativo() {
    const [valor, setValor] = useState<HorizonteDias>(90);
    return <SeletorHorizonte valor={valor} aoMudar={setValor} />;
  },
};
