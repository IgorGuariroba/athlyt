import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import { LinhaDoTempoDia } from "./linha-do-tempo-dia";

const MACROS = { calorias: 620, proteinaG: 45, carboidratosG: 60, gordurasG: 20 };

const ITENS: ItemLinhaDoTempo[] = [
  {
    tipo: "planejada",
    horaLocal: "12:30",
    entrada: {
      refeicaoRef: "almoco",
      nome: "Almoço",
      horaLocal: "12:30",
      macros: MACROS,
      itens: [{ nome: "Frango grelhado", quantidade: "180 g", ...MACROS }],
      explicacao: undefined,
    },
  },
  {
    tipo: "consumo",
    horaLocal: "08:00",
    consumo: {
      id: "c1",
      refeicaoRef: "cafe",
      nome: "Café da manhã",
      origem: "planejado",
      consumidoEm: new Date("2026-08-19T11:00:00Z"),
      horaLocal: "08:00",
      itens: [{ nome: "Ovos", quantidade: "3 un", ...MACROS }],
      macros: MACROS,
      planejado: MACROS,
    },
  },
  {
    tipo: "sessao",
    horaLocal: "19:00",
    sessaoId: "s1",
    nome: "Puxar A",
    estado: "concluida",
  },
] as ItemLinhaDoTempo[];

const acao = () => Promise.resolve();

const meta = {
  title: "Diário/LinhaDoTempoDia",
  component: LinhaDoTempoDia,
  args: {
    itens: ITENS,
    dia: "2026-08-19",
    fuso: "America/Sao_Paulo",
    confirmar: acao,
    desfazer: acao,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Monta o dia a partir dos itens do domínio. `apenasAlimentar` remove os cartões de sessão para a aba Dieta, sem duplicar cartões nem server actions entre as rotas.",
      },
    },
  },
} satisfies Meta<typeof LinhaDoTempoDia>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Diário: dieta e treino no mesmo extrato cronológico. */
export const DiaCompleto: Story = {};

/** Dieta: o mesmo dia, sem as sessões de treino. */
export const ApenasAlimentar: Story = { args: { apenasAlimentar: true } };
