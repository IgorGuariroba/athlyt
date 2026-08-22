import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Primitivos/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    <RadioGroup defaultValue="media" className="flex flex-col gap-3">
      {[
        { valor: "baixa", rotulo: "Intensidade baixa" },
        { valor: "media", rotulo: "Intensidade média" },
        { valor: "alta", rotulo: "Intensidade alta" },
      ].map((opcao) => (
        <div key={opcao.valor} className="flex items-center gap-3">
          <RadioGroupItem value={opcao.valor} id={`story-radio-${opcao.valor}`} />
          <Label htmlFor={`story-radio-${opcao.valor}`}>{opcao.rotulo}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
