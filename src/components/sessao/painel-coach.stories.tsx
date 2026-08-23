import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProvedorConexao } from "./estado-conexao";
import { PainelCoach } from "./painel-coach";

const exercicio = {
  exercicioId: "puxada-polia", nome: "Puxada na polia", descansoSeg: 120,
  series: [{ numero: 1, repeticoesSugeridas: "8–12", cargaKg: null, cargaSugeridaKg: 47.5, melhorCargaAnteriorKg: 45, repeticoes: null, rir: 3, concluida: false }],
};
const meta = {
  title: "Sessão/PainelCoach",
  component: PainelCoach,
  args: { exercicio },
  decorators: [(Story) => <div className="max-w-md bg-surface-container"><ProvedorConexao sessionId="storybook" seriesConfirmadas={[]} estadoForcado="offline"><Story /></ProvedorConexao></div>],
} satisfies Meta<typeof PainelCoach>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CoachLocalOffline: Story = {};
