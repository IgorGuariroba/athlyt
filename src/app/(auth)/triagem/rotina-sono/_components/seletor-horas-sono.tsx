"use client";

import { useState } from "react";

import { RoletaValor } from "@/components/ui/roleta-valor";
import { descreverHoras, formatarHoras } from "../../_components/formato-tempo";

const PADRAO_H = 7;
const MINIMO_H = 3;
const MAXIMO_H = 12;
const PASSO_H = 0.5;

export function SeletorHorasSono({ horasIniciais }: { horasIniciais?: number }) {
  const [horas, setHoras] = useState(() => {
    const bruto = horasIniciais ?? PADRAO_H;
    const encaixado = Math.round(bruto / PASSO_H) * PASSO_H;
    return Math.min(MAXIMO_H, Math.max(MINIMO_H, encaixado));
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <input type="hidden" name="horasSono" value={horas} />

      <p
        aria-hidden="true"
        className="text-[2rem] leading-none font-bold tabular-nums text-on-surface-strong"
      >
        {formatarHoras(horas)}
      </p>

      <RoletaValor
        eixo="x"
        rotulo="Horas de sono por noite"
        minimo={MINIMO_H}
        maximo={MAXIMO_H}
        passo={PASSO_H}
        valorInicial={horas}
        aoMudar={setHoras}
        passoPx={30}
        // Rótulo só nas horas cheias: as meias-horas ficam como traços.
        formatarRotulo={(valor) =>
          Number.isInteger(valor) ? formatarHoras(valor) : null
        }
        descreverValor={descreverHoras}
        className="h-32 w-[calc(100%+2rem)] rounded-xl"
      />

      <p className="text-center text-body-sm text-muted-foreground">
        Deslize para os lados ou use as setas para ajustar.
      </p>
    </div>
  );
}
