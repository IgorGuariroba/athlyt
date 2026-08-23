import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AjusteDescanso } from "./ajuste-descanso";

const meta = {
  title: "Sessão/AjusteDescanso",
  component: AjusteDescanso,
  args: { exercicioId: "puxada-polia", descansoPrescritoSeg: 120 },
  decorators: [(Story) => <div className="max-w-md overflow-hidden rounded-xl border border-border bg-surface-container"><Story /></div>],
} satisfies Meta<typeof AjusteDescanso>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PrescritoDoisMinutos: Story = {};
export const PrescritoUmMinuto: Story = { args: { exercicioId: "elevacao-lateral", descansoPrescritoSeg: 60 } };
