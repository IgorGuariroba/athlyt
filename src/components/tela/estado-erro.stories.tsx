import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoErro } from "./estado-erro";

const meta = {
  title: "Tela/EstadoErro",
  component: EstadoErro,
  parameters: {
    docs: {
      description: {
        component:
          "Falha terminal de uma etapa, com confirmação técnica e uma única ação de recuperação. A referência é o que o atleta cita ao pedir ajuda.",
      },
    },
  },
  args: {
    titulo: "Não foi possível continuar",
    descricao:
      "Algo interrompeu esta etapa. Tente carregá-la novamente para continuar.",
    statusDescricao: "A ocorrência foi enviada para investigação.",
    referencia: "erro-exemplo-4f83a",
    ajuda: "Se acontecer de novo, feche e abra o Athlyt.",
    acao: (
      <Button type="button" size="cta">
        <RefreshCw aria-hidden="true" />
        Tentar novamente
      </Button>
    ),
  },
} satisfies Meta<typeof EstadoErro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const SemReferencia: Story = {
  args: { referencia: undefined, ajuda: undefined },
};
