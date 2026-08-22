import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import { CabecalhoSecao } from "./cabecalho-secao";

const meta = {
  title: "Tela/CabecalhoSecao",
  component: CabecalhoSecao,
  args: {
    titulo: "Refeições de hoje",
    descricao: "Quatro registros, 1.840 kcal.",
  },
} satisfies Meta<typeof CabecalhoSecao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const SomenteTitulo: Story = {
  args: { descricao: undefined },
};

export const ComAcao: Story = {
  args: {
    acao: (
      <Button variant="ghost" size="sm">
        Ver tudo
      </Button>
    ),
  },
};
