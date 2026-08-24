import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NavegacaoDia } from "./navegacao-dia";

const meta = {
  title: "Diário/NavegacaoDia",
  component: NavegacaoDia,
  parameters: {
    docs: {
      description: {
        component:
          "Dia anterior, rótulo do dia e próximo dia. No dia de hoje a seta de avanço fica desabilitada, e não escondida: a afordância permanece no lugar e o layout não salta.",
      },
    },
  },
  args: {
    titulo: "Hoje",
    subtitulo: "2026-08-19",
    hrefAnterior: "/diario?dia=2026-08-18",
  },
} satisfies Meta<typeof NavegacaoDia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hoje: Story = {};

export const DiaPassado: Story = {
  args: {
    titulo: "18 ago.",
    subtitulo: "2026-08-18",
    hrefAnterior: "/diario?dia=2026-08-17",
    hrefProximo: "/diario?dia=2026-08-19",
  },
};
