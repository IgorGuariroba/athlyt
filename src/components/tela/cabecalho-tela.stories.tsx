import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "@/components/ui/badge";
import { CabecalhoTela } from "./cabecalho-tela";

const meta = {
  title: "Tela/CabecalhoTela",
  component: CabecalhoTela,
  parameters: {
    docs: {
      description: {
        component:
          "Títulos em sentence case; caixa alta só no eyebrow de contexto. `voltar` é omitido nas telas de primeiro nível (abas).",
      },
    },
  },
  args: {
    contexto: "Progresso",
    titulo: "Composição corporal",
    descricao: "Tendência dos últimos 90 dias, com registros comparáveis.",
  },
} satisfies Meta<typeof CabecalhoTela>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const ComRetorno: Story = {
  args: { voltar: { href: "/progresso", rotulo: "Progresso" } },
};

export const ComAcao: Story = {
  args: { acao: <Badge variant="outline">v1.0.0</Badge> },
};

export const SomenteTitulo: Story = {
  args: { contexto: undefined, descricao: undefined },
};
