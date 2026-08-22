import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
  title: "Primitivos/Textarea",
  component: Textarea,
  args: { rows: 3, placeholder: "Como foi o treino?" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const ComRotulo: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="story-obs">Observações da sessão</Label>
      <Textarea id="story-obs" rows={3} placeholder="Como foi o treino?" />
    </div>
  ),
};
