import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { itemEstimado, type ItemPrato } from "@/domain/alimentos/prato";
import { AcrescentarAlimento, type ResultadoComItens } from "./acrescentar-alimento";

const PAO = itemEstimado({
  descricao: "Pão de queijo",
  quantidade: 90,
  calorias: 270, proteinaG: 8, carboidratosG: 24, gordurasG: 16, fibrasG: 0,
  confianca: "media",
  modelo: "google/gemini-2.5-flash-lite",
  origemEstimativa: "texto",
});

const CAFE = itemEstimado({
  descricao: "Café com leite",
  quantidade: 200,
  unidade: "ml",
  calorias: 90, proteinaG: 5, carboidratosG: 8, gordurasG: 4, fibrasG: 0,
  confianca: "baixa",
  modelo: "google/gemini-2.5-flash-lite",
  origemEstimativa: "texto",
});

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

const meta = {
  title: "Diário/AcrescentarAlimento",
  component: AcrescentarAlimento,
  parameters: {
    docs: {
      description: {
        component:
          "Acréscimo de alimento a um prato em revisão, pelas mesmas três entradas do registro inicial: escrever, falar ou fotografar. Nunca pede energia nem macros ao atleta — é o que o app calcula.",
      },
    },
  },
  args: {
    dia: "2026-05-20",
    aoAcrescentar: () => {},
    aoFechar: () => {},
    estimarDescricao: async (): Promise<ResultadoComItens> => {
      await espera(600);
      return { ok: true, estimativa: { itens: [PAO] } };
    },
    estimarFoto: async (): Promise<ResultadoComItens> => {
      await espera(600);
      return { ok: true, estimativa: { itens: [PAO, CAFE] } };
    },
    transcrever: async () => {
      await espera(600);
      return { ok: true as const, transcricao: "um pão de queijo", trechosIncertos: [] };
    },
  },
} satisfies Meta<typeof AcrescentarAlimento>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TresEntradas: Story = {};

/** Sem foto nem áudio disponíveis, restam escrever — e nenhum macro a digitar. */
export const SomenteTexto: Story = {
  args: { estimarFoto: undefined, transcrever: undefined },
};

/**
 * A falha da IA não acrescenta nada e preserva o que foi escrito:
 * perder o texto por indisponibilidade custaria ao atleta o esforço
 * que ele acabou de fazer.
 */
export const EstimativaIndisponivel: Story = {
  args: {
    estimarDescricao: async (): Promise<ResultadoComItens> => {
      await espera(400);
      return { ok: false, erro: "A estimativa está indisponível agora. Tente de novo." };
    },
  },
};

/** O que foi acrescentado soma ao prato; o nome da refeição não muda. */
export const SomandoAoPrato: Story = {
  render: function Render(args) {
    const [itens, setItens] = useState<ItemPrato[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <AcrescentarAlimento
          {...args}
          aoAcrescentar={(novos) => setItens((atuais) => [...atuais, ...novos])}
        />
        <ul className="flex flex-col gap-1">
          {itens.map((item, indice) => (
            <li key={`${item.descricao}-${indice}`} className="text-body-sm text-muted-foreground">
              {item.descricao} · {item.calorias} kcal
            </li>
          ))}
        </ul>
      </div>
    );
  },
};
