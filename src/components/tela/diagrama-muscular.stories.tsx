import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { GrupoMuscular } from "@/domain/plano/exercicios";
import { DiagramaMuscular, rotuloVistaDoGrupo } from "./diagrama-muscular";

const GRUPOS = [
  "peito",
  "ombros",
  "biceps",
  "quadriceps",
  "core",
  "costas",
  "triceps",
  "gluteos",
  "posteriores",
  "panturrilhas",
] as const satisfies readonly GrupoMuscular[];

const meta = {
  title: "Tela/DiagramaMuscular",
  component: DiagramaMuscular,
  parameters: {
    docs: {
      description: {
        component:
          "Mídia de Execução: diagrama que complementa o fallback em texto, marcando a região trabalhada. A vista (frente ou costas) é derivada do grupo por `rotuloVistaDoGrupo`; a ficha do exercício mostra apenas a vista do grupo primário.",
      },
    },
  },
  args: { grupo: "peito", className: "h-40" },
} satisfies Meta<typeof DiagramaMuscular>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Peito: Story = {};

export const Costas: Story = {
  args: { grupo: "costas" },
};

export const TodosOsGrupos: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3">
      {GRUPOS.map((grupo) => (
        <div
          key={grupo}
          className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-container-high p-2"
        >
          <DiagramaMuscular grupo={grupo} className="h-20" />
          <p className="text-center text-caption text-muted-foreground">
            {grupo} · {rotuloVistaDoGrupo(grupo)}
          </p>
        </div>
      ))}
    </div>
  ),
};
