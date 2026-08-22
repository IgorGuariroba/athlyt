"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { opcoesDescanso, type RitmoDescanso } from "@/domain/sessao/descanso";
import { SeletorSegmentado } from "./seletor-segmentado";

const meta: Meta<typeof SeletorSegmentado> = {
  title: "Tela/SeletorSegmentado",
  component: SeletorSegmentado,
  parameters: {
    docs: {
      description: {
        component:
          "Irmão do `ControleSegmentado` para preferência local: não navega, não entra no histórico e mantém alvo de 44px. Usado no descanso entre séries, onde uma navegação a cada toque poluiria o histórico durante o treino.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DescansoEntreSeries: Story = {
  render: function DescansoEntreSeries() {
    const [ritmo, setRitmo] = useState<RitmoDescanso>("prescrito");
    const opcoes = opcoesDescanso(90);
    const escolhida = opcoes.find((opcao) => opcao.ritmo === ritmo);

    return (
      <div className="flex flex-col gap-3">
        <SeletorSegmentado
          rotulo="Descanso entre séries"
          name="story-descanso"
          valor={ritmo}
          opcoes={opcoes.map((opcao) => ({
            valor: opcao.ritmo,
            rotulo: opcao.rotulo,
            descricao: opcao.descricao,
          }))}
          aoMudar={setRitmo}
        />
        <p className="text-body-sm text-muted-foreground">
          {escolhida?.descricao}
        </p>
      </div>
    );
  },
};
