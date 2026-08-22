import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flame, Scale } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "Primitivos/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Um CTA principal por viewport; secundárias recuam visualmente. O tamanho `cta` tem 48px de altura e é o alvo de toque das ações que fecham uma etapa.",
      },
    },
  },
  args: { children: "Continuar" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(
        ["default", "outline", "secondary", "ghost", "destructive", "link"] as const
      ).map((variante) => (
        <Button key={variante} variant={variante}>
          {variante}
        </Button>
      ))}
    </div>
  ),
};

export const Tamanhos: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {(["xs", "sm", "default", "lg"] as const).map((tamanho) => (
          <Button key={tamanho} size={tamanho}>
            {tamanho}
          </Button>
        ))}
        <Button size="icon" aria-label="Ação com ícone">
          <Flame aria-hidden="true" />
        </Button>
      </div>
      <Button size="cta">CTA principal (48px)</Button>
    </div>
  ),
};

export const Estados: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Desabilitado</Button>
      <Button variant="outline" disabled>
        Desabilitado outline
      </Button>
      <Button>
        <Scale aria-hidden="true" />
        Com ícone
      </Button>
    </div>
  ),
};
