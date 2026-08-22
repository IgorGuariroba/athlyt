"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RoletaValor } from "./roleta-valor";

const meta: Meta<typeof RoletaValor> = {
  title: "Primitivos/RoletaValor",
  component: RoletaValor,
  parameters: {
    docs: {
      description: {
        component:
          "Entrada por gesto para grandezas contínuas e precisas: arrasto 1:1, inércia ao soltar e encaixe no tique. A física está coberta por testes em `roleta-valor.logica.ts`; esta galeria demonstra os dois eixos.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Peso: Story = {
  render: function Peso() {
    const [peso, setPeso] = useState(78.5);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-muted-foreground">Peso corporal</p>
        <p className="text-display font-bold tabular-nums text-on-surface-strong">
          {peso.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}{" "}
          <span className="text-title text-muted-foreground">kg</span>
        </p>
        <RoletaValor
          eixo="x"
          minimo={40}
          maximo={160}
          passo={0.1}
          valorInicial={78.5}
          aoMudar={setPeso}
          passoPx={14}
          rotulo="Peso corporal"
          className="h-32 w-full rounded-xl bg-surface-container"
          formatarRotulo={(valor) =>
            Math.abs(valor - Math.round(valor)) < 0.05
              ? `${Math.round(valor)}`
              : null
          }
          descreverValor={(valor) =>
            `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} quilos`
          }
        />
      </div>
    );
  },
};

export const Altura: Story = {
  render: function Altura() {
    const [altura, setAltura] = useState(175);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-muted-foreground">Altura</p>
        <p className="text-display font-bold tabular-nums text-on-surface-strong">
          {altura} <span className="text-title text-muted-foreground">cm</span>
        </p>
        <RoletaValor
          eixo="y"
          minimo={100}
          maximo={250}
          passo={1}
          valorInicial={175}
          aoMudar={setAltura}
          passoPx={22}
          rotulo="Altura"
          className="h-64 w-full rounded-xl bg-surface-container"
          formatarRotulo={(valor) => (valor % 5 === 0 ? `${valor}` : null)}
          descreverValor={(valor) => `${valor} centímetros`}
        />
      </div>
    );
  },
};
