import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "Primitivos/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Estados: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {[
        { id: "story-switch-a", rotulo: "Ligado", defaultChecked: true },
        { id: "story-switch-b", rotulo: "Desligado" },
        { id: "story-switch-c", rotulo: "Desabilitado", disabled: true },
      ].map(({ id, rotulo, ...props }) => (
        <div key={id} className="flex items-center justify-between gap-3">
          <Label htmlFor={id}>{rotulo}</Label>
          <Switch id={id} {...props} />
        </div>
      ))}
    </div>
  ),
};
