"use client";

import { useState } from "react";

import { RoletaValor } from "@/components/ui/roleta-valor";
import { descreverMinutos, formatarMinutos } from "../../_components/formato-tempo";

const PADRAO_MIN = 30;
const MINIMO_MIN = 5;
const MAXIMO_MIN = 120;
const PASSO_MIN = 5;

export function SeletorTempoPreparo({
  tempoInicialMin,
}: {
  tempoInicialMin?: number;
}) {
  const [minutos, setMinutos] = useState(() => {
    const bruto = tempoInicialMin ?? PADRAO_MIN;
    const encaixado = Math.round(bruto / PASSO_MIN) * PASSO_MIN;
    return Math.min(MAXIMO_MIN, Math.max(MINIMO_MIN, encaixado));
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <input type="hidden" name="tempoPreparoMin" value={minutos} />

      <p
        aria-hidden="true"
        className="font-brand text-[2rem] leading-none font-bold tracking-tight tabular-nums text-on-surface-strong"
      >
        {formatarMinutos(minutos)}
      </p>

      <RoletaValor
        eixo="x"
        rotulo="Tempo de preparo por refeição"
        minimo={MINIMO_MIN}
        maximo={MAXIMO_MIN}
        passo={PASSO_MIN}
        valorInicial={minutos}
        aoMudar={setMinutos}
        passoPx={26}
        // Rótulo a cada 15 min: marcos que o atleta reconhece sem poluir
        // a régua com todos os múltiplos de 5.
        formatarRotulo={(valor) => (valor % 15 === 0 ? formatarMinutos(valor) : null)}
        descreverValor={descreverMinutos}
        className="h-32 w-[calc(100%+2rem)] rounded-xl"
      />

      <p className="text-center text-body-sm text-muted-foreground">
        Deslize para os lados ou use as setas para ajustar.
      </p>
    </div>
  );
}
