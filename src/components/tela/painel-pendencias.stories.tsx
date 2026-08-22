import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import { PainelPendencias } from "./painel-pendencias";

const meta = {
  title: "Tela/PainelPendencias",
  component: PainelPendencias,
  parameters: {
    docs: {
      description: {
        component:
          "Limitação persistente com contexto, pendências em linhas legíveis e uma única ação de resolução. Cada item diz o que a ausência do dado custa — não apenas o que falta.",
      },
    },
  },
  args: {
    titulo: "Complete seu perfil",
    descricao:
      "Saia do Modo Conservador e receba orientações ajustadas aos seus dados.",
    itens: [
      {
        id: "idade",
        titulo: "Idade",
        descricao: "Cálculo de necessidades energéticas ajustado à idade",
      },
      {
        id: "objetivo",
        titulo: "Objetivo",
        descricao: "Priorização de desempenho e composição corporal",
      },
      {
        id: "disponibilidade",
        titulo: "Disponibilidade semanal",
        descricao: "Divisão de treino executável na sua rotina",
      },
    ],
    acao: <Button size="lg">Completar perfil</Button>,
  },
} satisfies Meta<typeof PainelPendencias>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const PendenciaUnica: Story = {
  args: {
    itens: [
      {
        id: "peso",
        titulo: "Peso atual",
        descricao: "Base para estimar sua manutenção calórica",
      },
    ],
  },
};
