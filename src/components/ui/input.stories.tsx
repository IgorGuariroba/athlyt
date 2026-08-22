import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Primitivos/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Altura mínima de 48px, unidade próxima do valor, texto de ajuda abaixo do campo.",
      },
    },
  },
  args: { placeholder: "78,5 kg" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const ComRotuloEAjuda: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="story-peso">Peso de hoje</Label>
      <Input id="story-peso" placeholder="78,5 kg" inputMode="decimal" />
      <p className="text-body-sm text-muted-foreground">
        Registre sempre no mesmo horário para reduzir ruído.
      </p>
    </div>
  ),
};

export const Invalido: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="story-altura">Altura</Label>
      <Input id="story-altura" defaultValue="0" aria-invalid />
      <p className="text-body-sm text-error">
        Informe um valor entre 120 e 230 cm.
      </p>
    </div>
  ),
};

export const Desabilitado: Story = {
  args: { defaultValue: "Somente leitura", disabled: true },
};
