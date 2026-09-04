import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProvedorConexao } from "./estado-conexao";
import { RegistroSerie } from "./registro-serie";

const meta = {
  title: "Sessão/RegistroSerie",
  component: RegistroSerie,
  args: {
    sessionId: "storybook", exercicioId: "puxada-polia", numero: 1, repeticoesSugeridas: "8", rirInicial: 2, rirSugerido: 3,
    descansoSeg: 120, concluida: false, cargaInicial: null, cargaSugerida: 47.5,
    melhorCargaAnterior: 45, repeticoesIniciais: null, modo: "repeticoes",
  },
  decorators: [(Story) => <div className="max-w-md bg-surface-container px-3"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]}><Story /></ProvedorConexao></div>],
} satisfies Meta<typeof RegistroSerie>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pendente: Story = {};
export const Registrada: Story = { args: { concluida: true, cargaInicial: 50, repeticoesIniciais: 8 } };
/** Treino encerrado neste aparelho: a série não registrada deixa de ser oferecida. */
export const AposEncerrarNesteAparelho: Story = {
  decorators: [(Story) => <div className="max-w-md bg-surface-container px-3"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]} encerradaForcada><Story /></ProvedorConexao></div>],
};
