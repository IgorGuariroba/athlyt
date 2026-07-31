"use client";

import { useState } from "react";

import { RoletaValor } from "@/components/ui/roleta-valor";

const ALTURA_INICIAL_CM = 175;
const ALTURA_MINIMA_CM = 100;
const ALTURA_MAXIMA_CM = 250;
const CM_POR_POLEGADA = 2.54;

type UnidadeAltura = "cm" | "imperial";

function formatarImperial(alturaCm: number) {
  const totalPolegadas = Math.round(alturaCm / CM_POR_POLEGADA);
  return `${Math.floor(totalPolegadas / 12)}′ ${totalPolegadas % 12}″`;
}

export function SeletorAltura({ alturaInicialCm }: { alturaInicialCm?: number }) {
  const [unidade, setUnidade] = useState<UnidadeAltura>("cm");
  const [alturaCm, setAlturaCm] = useState(
    Math.round(alturaInicialCm ?? ALTURA_INICIAL_CM),
  );

  return (
    <div className="flex flex-1 flex-col">
      <input type="hidden" name="alturaCm" value={alturaCm} />

      <div
        className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-surface p-1"
        aria-label="Unidade de altura"
      >
        {([
          ["imperial", "Pés e polegadas"],
          ["cm", "Centímetros"],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={unidade === valor}
            onClick={() => setUnidade(valor)}
            className={`h-11 rounded-lg text-body-md font-semibold transition-colors ${
              unidade === valor
                ? "bg-on-surface-strong text-background"
                : "text-muted-foreground hover:text-on-surface"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        <p
          aria-hidden="true"
          className="text-[2.75rem] leading-none font-bold tabular-nums text-on-surface-strong"
        >
          {unidade === "cm" ? `${alturaCm} cm` : formatarImperial(alturaCm)}
        </p>

        <RoletaValor
          eixo="y"
          rotulo="Altura"
          minimo={ALTURA_MINIMA_CM}
          maximo={ALTURA_MAXIMA_CM}
          passo={1}
          valorInicial={alturaCm}
          aoMudar={setAlturaCm}
          passoPx={22}
          // Rótulo a cada 5 cm: o suficiente para localizar a escala sem
          // transformar a régua num paredão de números.
          formatarRotulo={(valor) =>
            valor % 5 === 0
              ? unidade === "cm"
                ? `${valor}`
                : formatarImperial(valor)
              : null
          }
          descreverValor={(valor) =>
            unidade === "cm" ? `${valor} centímetros` : formatarImperial(valor)
          }
          className="h-64 w-full max-w-sm rounded-xl"
        />
      </div>

      <p className="mb-2 text-center text-body-sm text-muted-foreground">
        Deslize para cima ou para baixo, ou use as setas para ajustar.
      </p>
    </div>
  );
}
