import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PerfilUsuario } from "./perfil-usuario";

const meta = {
  title: "Tela/PerfilUsuario",
  component: PerfilUsuario,
  parameters: {
    docs: {
      description: {
        component:
          "Identidade diretamente sobre o fundo, antes dos grupos de configurações — não dentro de um cartão.",
      },
    },
  },
  args: { nome: "Atleta Athlyt", detalhe: "atleta@athlyt.com" },
} satisfies Meta<typeof PerfilUsuario>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const ComImagem: Story = {
  args: { imagem: "/equipamentos/personalizado.svg" },
};

/** Sessão sem e-mail no provedor: o componente cai no fallback de iniciais. */
export const SemDetalhe: Story = {
  args: { detalhe: null },
};
