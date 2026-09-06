import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProvedorConexao } from "./estado-conexao";
import { ConclusaoSessao } from "./conclusao-sessao";

const meta = {
  title: "Sessão/ConclusaoSessao",
  component: ConclusaoSessao,
  args: { concluirAction: () => Promise.resolve(undefined), seriesPendentes: 11 },
  decorators: [(Story) => <div className="max-w-md"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]}><Story /></ProvedorConexao></div>],
} satisfies Meta<typeof ConclusaoSessao>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ComSeriesPendentes: Story = {};
export const Completo: Story = { args: { seriesPendentes: 0 } };
/** Encerrado offline: o botão sai de cena e nada mais pode ser registrado nesta sessão. */
export const EncerradaNesteAparelho: Story = {
  decorators: [(Story) => <div className="max-w-md"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]} encerradaForcada><Story /></ProvedorConexao></div>],
};
