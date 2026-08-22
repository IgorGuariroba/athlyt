import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AvisoAcao } from "./aviso-acao";

const meta = {
  title: "Tela/AvisoAcao",
  component: AvisoAcao,
  parameters: {
    docs: {
      description: {
        component:
          "A mensagem aparece onde a ação foi disparada e se traz para o campo de visão. Renderize `null` no lugar do componente quando não houver aviso.",
      },
    },
  },
  args: { children: "Registro salvo no diário de hoje.", tipo: "sucesso" },
} satisfies Meta<typeof AvisoAcao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sucesso: Story = {};

export const Erro: Story = {
  args: {
    tipo: "erro",
    children: "Não foi possível salvar. Verifique a conexão e tente novamente.",
  },
};
