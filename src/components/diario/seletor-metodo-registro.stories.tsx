import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SeletorMetodoRegistro } from "./seletor-metodo-registro";

const meta = { component: SeletorMetodoRegistro, parameters: { layout: "padded" } } satisfies Meta<typeof SeletorMetodoRegistro>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RefeicaoExtra: Story = { args: { dia: "2026-08-30" } };
export const SubstituicaoPlanejada: Story = { args: { dia: "2026-08-30", refeicaoRef: "almoco" } };
