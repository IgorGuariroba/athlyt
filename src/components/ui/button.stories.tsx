import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoaderCircle } from "lucide-react";

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

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(
        ["default", "outline", "secondary", "ghost", "destructive", "link"] as const
      ).map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
};

export const Focus: Story = {
  parameters: { pseudo: { focus: true } },
};

export const FocusVisible: Story = {
  parameters: { pseudo: { focusVisible: true } },
};

export const Active: Story = {
  parameters: { pseudo: { active: true } },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  render: () => (
    <Button disabled aria-busy="true">
      <LoaderCircle aria-hidden="true" className="animate-spin" />
      Carregando
    </Button>
  ),
};
