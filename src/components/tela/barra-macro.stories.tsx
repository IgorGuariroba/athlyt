import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BarraMacro } from "./barra-macro";

const meta = {
  title: "Tela/BarraMacro",
  component: BarraMacro,
  parameters: {
    docs: {
      description: {
        component:
          "Cada macro mantém sua cor em toda a interface e a contribuição calórica é explícita — cor de nutriente é significado, não ornamento.",
      },
    },
  },
  args: { macro: "proteina", gramas: 48, caloriasTotais: 720 },
} satisfies Meta<typeof BarraMacro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Proteina: Story = {};

export const RefeicaoCompleta: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <BarraMacro macro="proteina" gramas={48} caloriasTotais={720} />
      <BarraMacro macro="carboidratos" gramas={82} caloriasTotais={720} />
      <BarraMacro macro="gorduras" gramas={22} caloriasTotais={720} />
    </div>
  ),
};
