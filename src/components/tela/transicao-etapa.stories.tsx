"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TransicaoEtapa } from "./transicao-etapa";

const meta = {
  title: "Tela/TransicaoEtapa",
  component: TransicaoEtapa,
  parameters: {
    docs: {
      description: {
        component:
          "A etapa entra deslizando no sentido do fluxo: da direita ao avançar, da esquerda ao voltar. A direção não vem do evento de navegação — avanço é `redirect` de server action e retorno é `<Link>`, dois caminhos que a página de destino não distingue. Ela é derivada da posição da etapa em relação à anterior, guardada em `sessionStorage`.",
      },
    },
  },
  args: { indice: 5, children: null },
} satisfies Meta<typeof TransicaoEtapa>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A animação só é visível na troca de etapa. Os botões remontam o
 * componente com `key`, que é como a cascata real se comporta ao trocar
 * de documento.
 */
export const AvancarEVoltar: Story = {
  render: function AvancarEVoltar() {
    const [indice, setIndice] = useState(5);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIndice((i) => Math.max(1, i - 1))}
          >
            Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIndice((i) => i + 1)}>
            Avançar
          </Button>
        </div>
        <TransicaoEtapa key={indice} indice={indice}>
          <div className="rounded-lg border border-border bg-surface-container p-4">
            <p className="text-title font-bold text-on-surface-strong">
              Etapa {indice}
            </p>
            <p className="text-body-sm text-muted-foreground">
              Conteúdo da pergunta da triagem.
            </p>
          </div>
        </TransicaoEtapa>
      </div>
    );
  },
};
