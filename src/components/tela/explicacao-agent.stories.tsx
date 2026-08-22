import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ExplicacaoAgent } from "./explicacao-agent";

/** Uma única explicação nas três apresentações: a diferença está no
 * peso de atenção que cada tela pode cobrar, não no conteúdo. */
const EXPLICACAO = {
  porque:
    "Escolhi o supino com halteres porque sua academia não tem barra livre e o halter poupa seu ombro direito.",
  dadosUsados: [
    { campo: "equipamentos", valor: "halteres, banco" },
    { campo: "lesoes", valor: "ombro direito" },
  ],
};

const meta = {
  title: "Tela/ExplicacaoAgent",
  component: ExplicacaoAgent,
  parameters: {
    docs: {
      description: {
        component:
          "O rótulo é escrito como a pergunta que o atleta faria — uma pergunta convida ao toque; um substantivo só rotula uma gaveta.",
      },
    },
  },
  args: { pergunta: "Por que este exercício?", explicacao: EXPLICACAO },
} satisfies Meta<typeof ExplicacaoAgent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Padrão: custo zero de espaço, descoberta por toque. */
export const Fechado: Story = {};

/** Só quando o atleta está prestes a divergir do plano, ou o plano acabou de mudar. */
export const Aberto: Story = {
  args: { pergunta: "Por que esta refeição?", apresentacao: "aberto" },
};

/** Telas sob carga física: entre séries o atleta lê uma frase, não uma tabela. */
export const Icone: Story = {
  args: { apresentacao: "icone" },
};

export const TomForte: Story = {
  args: { tom: "forte", apresentacao: "aberto" },
};

/** Planos gravados antes desta fatia não têm explicação; a tela trata a ausência. */
export const SemExplicacao: Story = {
  args: { explicacao: undefined },
};
