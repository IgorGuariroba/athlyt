import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  itemEstimado,
  reestimarMacros,
  renomearItem,
  type ItemPrato,
} from "@/domain/alimentos/prato";
import { RevisaoEstimativa } from "./revisao-estimativa";

const ITENS: ItemPrato[] = [
  itemEstimado({
    descricao: "Arroz branco cozido",
    quantidade: 150,
    calorias: 192, proteinaG: 3, carboidratosG: 42, gordurasG: 0, fibrasG: 2,
    confianca: "media",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
  itemEstimado({
    descricao: "Bife de alcatra grelhado",
    quantidade: 120,
    calorias: 250, proteinaG: 32, carboidratosG: 0, gordurasG: 13, fibrasG: 0,
    confianca: "alta",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
  itemEstimado({
    descricao: "Azeite no preparo",
    quantidade: 8,
    calorias: 71, proteinaG: 0, carboidratosG: 0, gordurasG: 8, fibrasG: 0,
    confianca: "baixa",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  }),
];

// Bebida em mililitros: é a unidade em que quem bebeu reconhece a
// porção, e a que o modelo declara para líquidos.
const REFRIGERANTE = itemEstimado({
  descricao: "Refrigerante de cola",
  quantidade: 250,
  unidade: "ml",
  calorias: 105, proteinaG: 0, carboidratosG: 27, gordurasG: 0, fibrasG: 0,
  confianca: "media",
  modelo: "google/gemini-2.5-flash-lite",
  origemEstimativa: "texto",
});

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
    aoMudar: () => undefined,
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

/**
 * Edição de um consumo já gravado: não houve estimativa de conjunto,
 * então não há tarja de incerteza a exibir. Inventá-la anunciava
 * "porção não informada" sobre porções que o modelo estimou da foto.
 * A marca por item, essa, permanece — vem do próprio item.
 */
export const SemEstimativaDeConjunto: Story = {
  render: () => <Interativo limitacoes={[]} origemEstimativa="foto" />,
};

/**
 * Acrescentar o que faltou pelas mesmas entradas do registro inicial.
 * Nenhuma delas pede energia ou macros: o formulário que fazia isso
 * era o único ponto do app a exigir do atleta o número que o app
 * existe para calcular.
 */
export const ComAcrescimoPorEstimativa: Story = {
  render: (args) => (
    <Interativo
      limitacoes={args.limitacoes}
      confianca={args.confianca}
      origemEstimativa="texto"
      acrescimo={{
        dia: "2026-05-20",
        estimarDescricao: () =>
          Promise.resolve({
            ok: true,
            estimativa: {
              itens: [
                itemEstimado({
                  descricao: "Pão de queijo",
                  quantidade: 90,
                  calorias: 270, proteinaG: 8, carboidratosG: 24, gordurasG: 16, fibrasG: 0,
                  confianca: "media",
                  modelo: "google/gemini-2.5-flash-lite",
                  origemEstimativa: "texto",
                }),
              ],
            },
          }),
      }}
    />
  ),
};

/**
 * O atleta corrigiu "Refrigerante de cola" para a versão zero, mas os
 * macros continuam sendo os do refrigerante comum. A linha diz de que
 * alimento os números são e oferece o recálculo daquele item — nunca
 * durante a digitação, que gastaria uma chamada por tecla.
 */
export const AlimentoCorrigidoSemRecalculo: Story = {
  render: function Render() {
    const [itens, setItens] = useState<ItemPrato[]>([
      renomearItem(REFRIGERANTE, "Refrigerante de cola zero"),
      ITENS[1],
    ]);
    return (
      <RevisaoEstimativa
        itens={itens}
        aoMudar={setItens}
        porcoesDescritas={["um copo", "um bife médio"]}
        nomesEstimados={["Refrigerante de cola", "Bife de alcatra grelhado"]}
        aoRecalcularItem={async (indice) => {
          await new Promise((resolver) => setTimeout(resolver, 900));
          setItens((atuais) =>
            atuais.map((item, i) =>
              i === indice
                ? reestimarMacros(item, {
                    calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
                    confianca: "alta", modelo: "google/gemini-2.5-flash-lite",
                  })
                : item,
            ),
          );
        }}
        limitacoes={[]}
        confianca="media"
        origemEstimativa="texto"
      />
    );
  },
};
