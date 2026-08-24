import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PainelMacrosDia } from "./painel-macros-dia";

const meta = {
  title: "Diário/PainelMacrosDia",
  component: PainelMacrosDia,
  parameters: {
    docs: {
      description: {
        component:
          "Consumido vs meta do dia em faixa compacta. O painel é cabeçalho da linha do tempo: não pode empurrar as refeições para fora da dobra.",
      },
    },
  },
  args: {
    painel: {
      meta: {
        calorias: 2220,
        proteinaG: 231,
        carboidratosG: 182,
        gordurasG: 70,
        fibrasG: 30,
      },
      consumido: {
        calorias: 1589,
        proteinaG: 57,
        carboidratosG: 190,
        gordurasG: 70,
        fibrasG: 12,
      },
      restante: {
        calorias: 631,
        proteinaG: 174,
        carboidratosG: -8,
        gordurasG: 0,
        fibrasG: 18,
      },
    },
  },
} satisfies Meta<typeof PainelMacrosDia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MeioDoDia: Story = {};

export const DiaVazio: Story = {
  args: {
    painel: {
      meta: {
        calorias: 2220,
        proteinaG: 231,
        carboidratosG: 182,
        gordurasG: 70,
        fibrasG: 30,
      },
      consumido: {
        calorias: 0,
        proteinaG: 0,
        carboidratosG: 0,
        gordurasG: 0,
        fibrasG: 0,
      },
      restante: {
        calorias: 2220,
        proteinaG: 231,
        carboidratosG: 182,
        gordurasG: 70,
        fibrasG: 30,
      },
    },
  },
};

/** Excesso aparece como barra cheia e restante negativo — nunca como alerta. */
export const AcimaDaMeta: Story = {
  args: {
    painel: {
      meta: {
        calorias: 2220,
        proteinaG: 231,
        carboidratosG: 182,
        gordurasG: 70,
        fibrasG: 30,
      },
      consumido: {
        calorias: 2610,
        proteinaG: 240,
        carboidratosG: 220,
        gordurasG: 92,
        fibrasG: 34,
      },
      restante: {
        calorias: -390,
        proteinaG: -9,
        carboidratosG: -38,
        gordurasG: -22,
        fibrasG: -4,
      },
    },
  },
};
