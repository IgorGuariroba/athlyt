import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Award } from "lucide-react";

import { SeloConclusao } from "./selo-conclusao";

const meta = {
  title: "Tela/SeloConclusao",
  component: SeloConclusao,
  parameters: {
    docs: {
      description: {
        component:
          "Única marca celebratória do produto. DESIGN.md > Typography autoriza a escala de destaque apenas para resultados excepcionais — concentrar essa autorização aqui evita que cada tela de conclusão invente o próprio selo.",
      },
    },
  },
  args: {
    Icone: Award,
    contexto: "Treino concluído",
    titulo: "Pull A",
  },
} satisfies Meta<typeof SeloConclusao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Concluido: Story = {};

export const Encerrado: Story = {
  args: {
    tom: "atencao",
    contexto: "Sessão encerrada",
    titulo: "Pull A",
    descricao: "Motivo: dor no ombro direito",
  },
};

export const ComDescricao: Story = {
  args: {
    descricao: "Primeiro treino completo da semana.",
  },
};
