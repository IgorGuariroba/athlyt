import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CartaoConsumo,
  CartaoRefeicaoPlanejada,
  CartaoSessaoDiario,
} from "./cartoes-diario";

const MACROS_PLANEJADOS = {
  calorias: 556,
  proteinaG: 56,
  carboidratosG: 0,
  gordurasG: 0,
  fibrasG: 6,
};

const meta = {
  title: "Diário/Cartões",
  component: CartaoRefeicaoPlanejada,
  parameters: {
    docs: {
      description: {
        component:
          "Os três estados do dia na linha do tempo. Prescrição usa moldura tracejada e não pode se parecer com consumo; consumo estimado por foto carrega a marca que o distingue de um valor medido.",
      },
    },
  },
  args: {
    nome: "Café da manhã",
    macros: MACROS_PLANEJADOS,
    itens: [
      { descricao: "4 claras + 2 ovos inteiros (≈28 g proteína)", calorias: 220, proteinaG: 28, carboidratosG: 2, gordurasG: 11, fibrasG: 0 },
      { descricao: "100 g aveia (≈12 g proteína)", calorias: 380, proteinaG: 12, carboidratosG: 60, gordurasG: 7, fibrasG: 10 },
      { descricao: "100 g frutas vermelhas", calorias: 50, proteinaG: 1, carboidratosG: 12, gordurasG: 0, fibrasG: 3 },
    ],
    explicacao: {
      porque: "Concentra proteína no início do dia para atingir a meta diária sem depender do jantar.",
      dadosUsados: [],
    },
    hrefFoto: "/diario/registrar/foto?dia=2026-08-19",
    hrefAjustar: "/diario/refeicao/cafe?dia=2026-08-19",
    confirmacao: (
      <Button className="w-full" aria-label="Comi como planejado: Café da manhã">
        <Check className="size-4" aria-hidden="true" /> Comi como planejado
      </Button>
    ),
  },
} satisfies Meta<typeof CartaoRefeicaoPlanejada>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RefeicaoPlanejada: Story = {};

export const ConsumoEstimadoPorFoto: Story = {
  render: () => (
    <CartaoConsumo
      nome="Café da manhã: Ovos mexidos, aveia e frutas"
      estimadoPorFoto
      macros={{ calorias: 264, proteinaG: 14, carboidratosG: 19, gordurasG: 15, fibrasG: 3 }}
      planejado={MACROS_PLANEJADOS}
      acoes={
        <Button variant="ghost" size="sm">
          <Undo2 className="size-4" aria-hidden="true" /> Desfazer
        </Button>
      }
    />
  ),
};

export const ConsumoAvulso: Story = {
  render: () => (
    <CartaoConsumo
      nome="Whey com banana"
      macros={{ calorias: 310, proteinaG: 28, carboidratosG: 34, gordurasG: 4, fibrasG: 3 }}
    />
  ),
};

export const SessaoConcluida: Story = {
  render: () => (
    <CartaoSessaoDiario nome="Pull A" estado="concluida" href="/sessao/1/resumo" />
  ),
};

export const SessaoEmAndamento: Story = {
  render: () => (
    <CartaoSessaoDiario nome="Push B" estado="em_andamento" href="/sessao/2" />
  ),
};
