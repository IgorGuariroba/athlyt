"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ControleFaixa } from "./controle-faixa";

const meta: Meta<typeof ControleFaixa> = {
  title: "Primitivos/ControleFaixa",
  component: ControleFaixa,
  parameters: {
    docs: {
      description: {
        component:
          "Ajuste contínuo e aproximado — zoom, opacidade. Para grandezas precisas onde cada tique importa, use `RoletaValor`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Zoom: Story = {
  render: function Zoom() {
    const [zoom, setZoom] = useState(140);
    return (
      <ControleFaixa
        id="story-zoom"
        rotulo="Zoom da comparação"
        valor={zoom}
        aoMudar={setZoom}
        minimo={100}
        maximo={200}
        formatarValor={(valor) => `${valor}%`}
      />
    );
  },
};
