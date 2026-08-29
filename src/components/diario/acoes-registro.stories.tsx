import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AcoesRegistro } from "./acoes-registro";

const meta = {
  title: "Diário/AcoesRegistro",
  component: AcoesRegistro,
  parameters: {
    docs: {
      description: {
        component:
          "Fotografar é o caminho padrão e ocupa a largura; registrar item a item fica no alvo quadrado ao lado. A hierarquia é a decisão que o componente guarda.",
      },
    },
  },
  args: {
    hrefFoto: "/diario/registrar/foto?dia=2026-08-19",
    hrefBusca: "/diario/registrar?dia=2026-08-19",
  },
} satisfies Meta<typeof AcoesRegistro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const ComRegistroRetroativo: Story = {
  args: { hrefDescricao: "/diario/registrar/descricao?dia=2026-08-19" },
};
