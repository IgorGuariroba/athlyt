import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GradeSelecaoFoto, ItemSelecaoFoto } from "./grade-selecao-foto";

const FOTO = "/equipamentos/personalizado.svg";

const meta: Meta<typeof GradeSelecaoFoto> = {
  title: "Tela/GradeSelecaoFoto",
  component: GradeSelecaoFoto,
  parameters: {
    docs: {
      description: {
        component:
          "Seleção por toque na imagem inteira: numa grade de miniaturas, uma caixa de seleção ao lado da legenda obrigaria a mirar um alvo de 16px desconectado do conteúdo que se quer escolher. O indicador só aparece quando marcado — um círculo vazio em cada item competiria com as próprias fotos.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    <GradeSelecaoFoto>
      <ItemSelecaoFoto
        id="story-foto-frente"
        name="story-fotos"
        value="frente"
        src={FOTO}
        alt="Foto de progresso, vista frontal"
        rotulo="Frente"
        meta="12 fev"
        defaultChecked
      />
      <ItemSelecaoFoto
        id="story-foto-lado"
        name="story-fotos"
        value="lado"
        src={FOTO}
        alt="Foto de progresso, vista lateral"
        rotulo="Lado"
        meta="12 fev"
      />
      <ItemSelecaoFoto
        id="story-foto-costas"
        name="story-fotos"
        value="costas"
        src={FOTO}
        alt="Foto de progresso, vista posterior"
        rotulo="Costas"
        meta="12 fev"
      />
      <ItemSelecaoFoto
        id="story-foto-livre"
        name="story-fotos"
        value="livre"
        src={FOTO}
        alt="Foto de progresso, enquadramento livre"
        rotulo="Livre"
      />
    </GradeSelecaoFoto>
  ),
};
