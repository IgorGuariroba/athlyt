"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { CapturaFoto } from "./captura-foto";

const meta: Meta<typeof CapturaFoto> = {
  title: "Fotos/CapturaFoto",
  component: CapturaFoto,
  parameters: {
    docs: {
      description: {
        component:
          "Câmera traseira em um toque e galeria como alternativa, com prévia antes do envio. Usada no registro de refeição por foto e nas fotos de progresso.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `CapturaFoto` é controlado por callback: o estado do arquivo pertence
 * a quem a usa. A story segura esse estado como a tela faria.
 */
export const RegistroDeRefeicao: Story = {
  render: function RegistroDeRefeicao() {
    const [arquivo, setArquivo] = useState<File | null>(null);
    return (
      <CapturaFoto
        arquivo={arquivo}
        aoEscolher={setArquivo}
        rotuloCaptura="Fotografar o prato"
        dica="Enquadre o prato inteiro, de cima. Um talher ao lado ajuda a estimar a porção."
      />
    );
  },
};

export const RotulosPadrao: Story = {
  render: function RotulosPadrao() {
    const [arquivo, setArquivo] = useState<File | null>(null);
    return <CapturaFoto arquivo={arquivo} aoEscolher={setArquivo} />;
  },
};
