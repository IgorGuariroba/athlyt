import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BadgeConexao, ProvedorConexao } from "./estado-conexao";

const meta = {
  title: "Sessão/EstadoConexao",
  component: BadgeConexao,
  decorators: [(Story) => <ProvedorConexao sessionId="storybook" seriesConfirmadas={[]}><Story /></ProvedorConexao>],
} satisfies Meta<typeof BadgeConexao>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Online: Story = {};
