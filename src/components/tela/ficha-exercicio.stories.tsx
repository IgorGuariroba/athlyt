import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FichaExercicio } from "./ficha-exercicio";

const meta = {
  title: "Tela/FichaExercicio",
  component: FichaExercicio,
  parameters: {
    docs: {
      description: {
        component:
          "Mídia de Execução (CONTEXT.md): ícone de informação junto ao nome do exercício, separado das ações operacionais. Abre a animação real da ExerciseDB (espelhada no R2 via `/api/midia-execucao/{id}`), com texto e diagrama de músculos-alvo como fallback quando não há mídia mapeada.",
      },
    },
  },
  args: {
    nome: "Supino reto com barra",
    grupo: "peito",
    grupoMuscular: "Peito",
    comoExecutar:
      "Deitado no banco, retraça as escápulas e mantenha os pés firmes no chão. Desça a barra até tocar levemente o peito, cotovelos a cerca de 45° do tronco, e empurre de volta sem travar bruscamente o cotovelo.",
    midiaUrl: "/api/midia-execucao/supino-barra",
  },
} satisfies Meta<typeof FichaExercicio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComMidia: Story = {
  render: (args) => (
    <div className="flex items-center gap-1">
      <h3 className="text-title font-bold">{args.nome}</h3>
      <FichaExercicio {...args} />
    </div>
  ),
};

/** Sem `midiaUrl`, o diagrama de músculos-alvo assume o lugar da animação. */
export const SemMidia: Story = {
  args: {
    nome: "Prancha isométrica",
    grupo: "core",
    grupoMuscular: "Core",
    comoExecutar:
      "Apoie antebraços e pontas dos pés no chão, corpo alinhado da cabeça aos calcanhares. Contraia abdômen e glúteos mantendo o quadril na mesma altura dos ombros, sem deixar a lombar ceder.",
    midiaUrl: undefined,
  },
  render: (args) => (
    <div className="flex items-center gap-1">
      <h3 className="text-title font-bold">{args.nome}</h3>
      <FichaExercicio {...args} />
    </div>
  ),
};
