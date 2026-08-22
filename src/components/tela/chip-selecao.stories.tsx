import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChipSelecao } from "./chip-selecao";

const meta = {
  title: "Tela/ChipSelecao",
  component: ChipSelecao,
  parameters: {
    docs: {
      description: {
        component:
          "Seleção múltipla com alvo de 44px; o estado aparece na superfície e na borda. Usa `input[type=checkbox]` nativo, então o valor entra no `FormData` sem estado de cliente.",
      },
    },
  },
  args: {
    id: "story-chip",
    name: "story-exercicios",
    value: "supino",
    rotulo: "Supino",
  },
} satisfies Meta<typeof ChipSelecao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Marcado: Story = {
  args: { defaultChecked: true },
};

export const Grupo: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {[
        { valor: "supino", rotulo: "Supino", marcado: true },
        { valor: "agachamento", rotulo: "Agachamento", marcado: true },
        { valor: "remada", rotulo: "Remada", marcado: false },
        { valor: "terra", rotulo: "Levantamento terra", marcado: false },
      ].map((chip) => (
        <ChipSelecao
          key={chip.valor}
          id={`story-chip-${chip.valor}`}
          name="story-exercicios"
          value={chip.valor}
          rotulo={chip.rotulo}
          defaultChecked={chip.marcado}
        />
      ))}
    </div>
  ),
};
