import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "Primitivos/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Estados: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {[
        { id: "story-check-a", rotulo: "Marcado", defaultChecked: true },
        { id: "story-check-b", rotulo: "Padrão" },
        { id: "story-check-c", rotulo: "Desabilitado", disabled: true },
      ].map(({ id, rotulo, ...props }) => (
        <div key={id} className="flex items-center gap-3">
          <Checkbox id={id} {...props} />
          <Label htmlFor={id}>{rotulo}</Label>
        </div>
      ))}
    </div>
  ),
};
