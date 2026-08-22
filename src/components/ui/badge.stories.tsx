import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";

const meta = {
  title: "Primitivos/Badge",
  component: Badge,
  args: { children: "86%" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {(
        ["default", "secondary", "destructive", "outline", "ghost"] as const
      ).map((variante) => (
        <Badge key={variante} variant={variante}>
          {variante}
        </Badge>
      ))}
    </div>
  ),
};
