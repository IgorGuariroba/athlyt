import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { itemEstimado, type ItemPrato } from "@/domain/alimentos/prato";
import { RevisaoEstimativa } from "./revisao-estimativa";

const ITENS: ItemPrato[] = [
  itemEstimado({
    descricao: "Arroz branco cozido",
    quantidadeGramas: 150,
    calorias: 192, proteinaG: 3, carboidratosG: 42, gordurasG: 0, fibrasG: 2,
    confianca: "media",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
  itemEstimado({
    descricao: "Bife de alcatra grelhado",
    quantidadeGramas: 120,
    calorias: 250, proteinaG: 32, carboidratosG: 0, gordurasG: 13, fibrasG: 0,
    confianca: "alta",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
  itemEstimado({
    descricao: "Azeite no preparo",
    quantidadeGramas: 8,
    calorias: 71, proteinaG: 0, carboidratosG: 0, gordurasG: 8, fibrasG: 0,
    confianca: "baixa",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
];

function Interativo(args: Omit<React.ComponentProps<typeof RevisaoEstimativa>, "itens" | "aoMudar">) {
  const [itens, setItens] = useState<ItemPrato[]>(ITENS);
  return <RevisaoEstimativa {...args} itens={itens} aoMudar={setItens} />;
}

const meta = {
  title: "Diário/RevisaoEstimativa",
  component: RevisaoEstimativa,
  parameters: {
    docs: {
      description: {
        component:
          "Revisão dos itens estimados antes de virarem Consumo Real. A incerteza aparece antes da lista e o total recalcula a cada correção — estimativa nunca pode ser lida como medição.",
      },
    },
  },
  args: {
    itens: ITENS,
    aoMudar: () => {},
    limitacoes: ["A quantidade de arroz não foi informada; assumi uma porção usual."],
    confianca: "media" as const,
    origemEstimativa: "texto" as const,
  },
} satisfies Meta<typeof RevisaoEstimativa>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PorDescricaoEscrita: Story = {
  render: (args) => (
    <Interativo
      porcoesDescritas={["duas colheres", "um bife médio", "um fio"]}
      limitacoes={args.limitacoes}
      confianca={args.confianca}
      origemEstimativa="texto"
    />
  ),
};

export const PorAudio: Story = {
  render: () => (
    <Interativo
      porcoesDescritas={["duas colheres", "um bife médio", "um fio"]}
      limitacoes={["Trecho sobre a salada ficou inaudível."]}
      confianca="baixa"
      origemEstimativa="audio"
    />
  ),
};

export const SemLimitacoes: Story = {
  render: () => <Interativo limitacoes={[]} confianca="alta" origemEstimativa="foto" />,
};
