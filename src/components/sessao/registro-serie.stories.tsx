import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { melhorMarca } from "@/domain/sessao/recorde";
import { ProvedorConexao } from "./estado-conexao";
import { RegistroSerie } from "./registro-serie";

const meta = {
  title: "Sessão/RegistroSerie",
  component: RegistroSerie,
  args: {
    sessionId: "storybook", exercicioId: "puxada-polia", numero: 1, repeticoesSugeridas: "8", rirInicial: 2, rirSugerido: 3,
    descansoSeg: 120, concluida: false, cargaInicial: null, cargaSugerida: 47.5,
    marcaHistorica: melhorMarca([{ cargaKg: 45, repeticoes: 8 }]), repeticoesIniciais: null, modo: "repeticoes",
    seriesDoExercicio: [{ numero: 1, cargaKg: null, repeticoes: null, concluida: false }],
  },
  decorators: [(Story) => <div className="max-w-md bg-surface-container px-3"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]}><Story /></ProvedorConexao></div>],
} satisfies Meta<typeof RegistroSerie>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pendente: Story = {};
export const Registrada: Story = { args: { concluida: true, cargaInicial: 50, repeticoesIniciais: 8, seriesDoExercicio: [{ numero: 1, cargaKg: 50, repeticoes: 8, concluida: true }] } };
/** Treino encerrado neste aparelho: a série não registrada deixa de ser oferecida. */
export const AposEncerrarNesteAparelho: Story = {
  decorators: [(Story) => <div className="max-w-md bg-surface-container px-3"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]} encerradaForcada><Story /></ProvedorConexao></div>],
};
