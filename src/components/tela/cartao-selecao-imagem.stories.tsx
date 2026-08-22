import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CartaoSelecaoImagem } from "./cartao-selecao-imagem";

const meta = {
  title: "Tela/CartaoSelecaoImagem",
  component: CartaoSelecaoImagem,
  parameters: {
    docs: {
      description: {
        component:
          "Catálogos visuais em linha: miniatura, rótulo e controle formam um único alvo de toque.",
      },
    },
  },
  args: {
    id: "story-equipamento-halteres",
    name: "story-equipamentos",
    value: "halteres",
    rotulo: "Halteres",
    src: "/equipamentos/personalizado.svg",
  },
} satisfies Meta<typeof CartaoSelecaoImagem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Marcado: Story = {
  args: { defaultChecked: true },
};
