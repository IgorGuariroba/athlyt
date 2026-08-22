import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Progress } from "./progress";

const meta = {
  title: "Primitivos/Progress",
  component: Progress,
  parameters: {
    docs: {
      description: {
        component:
          "Barra fina, sem percentual decorativo — o número acompanha o rótulo, não a barra.",
      },
    },
  },
  args: { value: 60 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Escala: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {[25, 60, 100].map((valor) => (
        <Progress key={valor} value={valor} />
      ))}
    </div>
  ),
};
