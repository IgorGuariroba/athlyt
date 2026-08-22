import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CascataShell } from "./cascata-shell";

const meta = {
  title: "Tela/CascataShell",
  component: CascataShell,
  parameters: {
    docs: {
      description: {
        component:
          "Progresso, retorno e título das perguntas da triagem. Nas stories usamos `elemento=\"section\"`; na tela real é `main`.",
      },
    },
  },
  args: {
    titulo: "Qual é o seu objetivo atual?",
    indice: 5,
    total: 14,
    elemento: "section",
    children: (
      <p className="text-body-sm text-muted-foreground">
        Conteúdo variável da etapa.
      </p>
    ),
  },
} satisfies Meta<typeof CascataShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MeioDaCascata: Story = {};

export const PrimeiraEtapa: Story = {
  args: { titulo: "Qual é o seu sexo biológico?", indice: 1 },
};

export const UltimaEtapa: Story = {
  args: { titulo: "Revise suas respostas", indice: 14 },
};
