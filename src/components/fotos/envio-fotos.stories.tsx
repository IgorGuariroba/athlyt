import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { EnvioFotos } from "./envio-fotos";

const meta = {
  title: "Fotos/EnvioFotos",
  component: EnvioFotos,
  parameters: {
    docs: {
      description: {
        component:
          "Formulário de envio das fotos de progresso. A `action` real é uma server action que grava no R2; aqui ela é substituída por um stub para que a galeria demonstre os dois desfechos — sucesso e erro — sem infraestrutura.",
      },
    },
  },
} satisfies Meta<typeof EnvioFotos>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sucesso: Story = {
  args: {
    action: () => Promise.resolve({ ok: true }),
    // Sem redirecionar para fora do canvas ao concluir.
    destinoSucesso: "#",
  },
};

export const Falha: Story = {
  args: {
    action: () =>
      Promise.resolve({
        ok: false,
        erro: "Não foi possível enviar as fotos. Verifique a conexão.",
      }),
    destinoSucesso: "#",
  },
};
