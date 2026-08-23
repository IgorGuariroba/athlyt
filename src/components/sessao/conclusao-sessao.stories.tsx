import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProvedorConexao } from "./estado-conexao";
import { ConclusaoSessao } from "./conclusao-sessao";

const meta = {
  title: "Sessão/ConclusaoSessao",
  component: ConclusaoSessao,
  args: { concluirAction: async () => undefined, seriesPendentes: 11 },
  decorators: [(Story) => <div className="max-w-md"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]}><Story /></ProvedorConexao></div>],
} satisfies Meta<typeof ConclusaoSessao>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ComSeriesPendentes: Story = {};
export const Completo: Story = { args: { seriesPendentes: 0 } };
