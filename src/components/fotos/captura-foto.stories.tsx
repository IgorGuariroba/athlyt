"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
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

export const Interacoes: Story = {
  render: function Interacoes() {
    const [arquivo, setArquivo] = useState<File | null>(null);
    return <CapturaFoto arquivo={arquivo} aoEscolher={setArquivo} />;
  },
  play: async ({ canvas, userEvent }) => {
    const fotoDaCamera = new File(["foto"], "prato.jpg", { type: "image/jpeg" });
    await userEvent.upload(canvas.getByLabelText("Tirar foto"), fotoDaCamera);

    await expect(canvas.getByAltText("Prévia da foto escolhida")).toBeInTheDocument();
    await expect(canvas.getByText("prato.jpg")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Trocar foto" }));
    await expect(canvas.getByRole("button", { name: "Tirar foto" })).toBeInTheDocument();
    await expect(canvas.queryByAltText("Prévia da foto escolhida")).not.toBeInTheDocument();

    const fotoDaGaleria = new File(["foto nova"], "prato-da-galeria.png", {
      type: "image/png",
    });
    await userEvent.upload(canvas.getByLabelText("Escolher da galeria"), fotoDaGaleria);

    await expect(canvas.getByAltText("Prévia da foto escolhida")).toBeInTheDocument();
    await expect(canvas.getByText("prato-da-galeria.png")).toBeInTheDocument();
  },
};
