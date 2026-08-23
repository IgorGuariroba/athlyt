import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Esqueleto,
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "./esqueleto-tela";

const meta = {
  title: "Tela/EsqueletoTela",
  component: EsqueletoTela,
  parameters: {
    docs: {
      description: {
        component:
          "Silhueta de carregamento para dados remotos. Reserva a geometria do conteúdo que vem, evitando o salto de layout quando a rota sai da suspensão.",
      },
    },
  },
  args: { rotulo: "Carregando o diário" },
} satisfies Meta<typeof EsqueletoTela>;

export default meta;
type Story = StoryObj<typeof meta>;

/** O uso típico de um `loading.tsx`: cabeçalho seguido de lista. */
export const Padrao: Story = {
  args: {
    children: (
      <>
        <EsqueletoCabecalho />
        <EsqueletoLista />
      </>
    ),
  },
};

export const CabecalhoSemDescricao: Story = {
  args: { children: <EsqueletoCabecalho comDescricao={false} /> },
};

export const ListaLonga: Story = {
  args: { children: <EsqueletoLista itens={6} /> },
};

/** O bloco cru, para silhuetas que não são cabeçalho nem lista. */
export const BlocosSoltos: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-3 px-6">
        <Esqueleto className="h-32 w-full rounded-xl" />
        <Esqueleto className="h-4 w-1/2" />
      </div>
    ),
  },
};
