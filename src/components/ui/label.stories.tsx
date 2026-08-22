import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Primitivos/Label",
  component: Label,
  args: { children: "Peso de hoje" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const AssociadoAoCampo: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="story-label-peso">Peso de hoje</Label>
      <Input id="story-label-peso" placeholder="78,5 kg" />
    </div>
  ),
};
