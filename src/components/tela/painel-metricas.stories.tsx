import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Clock3, Dumbbell, Layers3 } from "lucide-react";

import { Metrica, PainelMetricas } from "./painel-metricas";

const meta: Meta<typeof PainelMetricas> = {
  title: "Tela/PainelMetricas",
  component: PainelMetricas,
  parameters: {
    docs: {
      description: {
        component:
          "Faixa de 2 a 4 números de resumo; unidade junto do valor, rótulo abaixo.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ResumoDaSessao: Story = {
  render: () => (
    <PainelMetricas>
      <Metrica Icone={Clock3} valor={52} unidade="m" rotulo="Duração" />
      <Metrica Icone={Layers3} valor={18} rotulo="Séries" />
      <Metrica Icone={Dumbbell} valor={4820} unidade=" kg" rotulo="Volume" />
    </PainelMetricas>
  ),
};

export const SemIcones: Story = {
  render: () => (
    <PainelMetricas>
      <Metrica valor="78,5" unidade=" kg" rotulo="Peso" />
      <Metrica valor="18,2" unidade="%" rotulo="Gordura" />
    </PainelMetricas>
  ),
};
