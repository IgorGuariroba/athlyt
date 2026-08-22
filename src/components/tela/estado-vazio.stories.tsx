import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoVazio } from "./estado-vazio";

const meta = {
  title: "Tela/EstadoVazio",
  component: EstadoVazio,
  parameters: {
    docs: {
      description: {
        component:
          "Explica a causa e oferece a próxima ação, sem linguagem punitiva. Quando nada pode ser feito agora, o estado explica a causa e para por aí.",
      },
    },
  },
  args: {
    Icone: TrendingUp,
    titulo: "Sem registros no período",
    descricao: "A tendência aparece a partir do segundo registro comparável.",
  },
} satisfies Meta<typeof EstadoVazio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComAcao: Story = {
  args: {
    acao: (
      <Button variant="outline" size="sm">
        Registrar peso
      </Button>
    ),
  },
};

export const SemAcao: Story = {
  args: {
    Icone: undefined,
    titulo: "Sem ação disponível",
    descricao:
      "Quando nada pode ser feito agora, o estado explica a causa e para por aí.",
  },
};

export const Centralizado: Story = {
  args: { centralizado: true, className: "min-h-80" },
};
