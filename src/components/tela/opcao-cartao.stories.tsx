import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flame, RefreshCw } from "lucide-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { CartaoCheckbox, CartaoRadio } from "./opcao-cartao";

const meta: Meta<typeof CartaoRadio> = {
  title: "Tela/OpcaoCartao",
  component: CartaoRadio,
  parameters: {
    docs: {
      description: {
        component:
          "Opção destacada da cascata, com ícone, descrição e controle circular. O cartão inteiro é o alvo de toque.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EscolhaUnica: Story = {
  render: () => (
    <RadioGroup defaultValue="recomposicao" className="flex flex-col gap-3">
      <CartaoRadio
        id="story-objetivo-recomposicao"
        value="recomposicao"
        titulo="Recomposição corporal"
        descricao="Reduzir gordura e desenvolver massa muscular a partir da sua linha de base."
        Icone={RefreshCw}
      />
      <CartaoRadio
        id="story-objetivo-gordura"
        value="perder-gordura"
        titulo="Priorizar perda de gordura"
        descricao="Preservar o máximo de massa muscular."
        Icone={Flame}
      />
    </RadioGroup>
  ),
};

export const EscolhaMultipla: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <CartaoCheckbox
        id="story-disponibilidade-segunda"
        name="dias"
        value="segunda"
        titulo="Segunda-feira"
        descricao="Disponível para treino"
        defaultChecked
      />
      <CartaoCheckbox
        id="story-disponibilidade-quarta"
        name="dias"
        value="quarta"
        titulo="Quarta-feira"
        descricao="Disponível para treino"
      />
    </div>
  ),
};

export const SemIconeNemDescricao: Story = {
  render: () => (
    <RadioGroup defaultValue="kg" className="flex flex-col gap-3">
      <CartaoRadio id="story-unidade-kg" value="kg" titulo="Quilogramas" />
      <CartaoRadio id="story-unidade-lb" value="lb" titulo="Libras" />
    </RadioGroup>
  ),
};
