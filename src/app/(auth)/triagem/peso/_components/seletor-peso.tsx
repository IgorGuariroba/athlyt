"use client";

import { useState } from "react";

import { RoletaValor } from "@/components/ui/roleta-valor";

const KG_PARA_LB = 2.2046226218;
const PESO_INICIAL_KG = 75;
const PESO_MINIMO_KG = 30;
const PESO_MAXIMO_KG = 300;

type Unidade = "kg" | "lb";

function arredondarUmaCasa(valor: number) {
  return Math.round(valor * 10) / 10;
}

export function SeletorPeso({ pesoInicialKg }: { pesoInicialKg?: number }) {
  const [unidade, setUnidade] = useState<Unidade>("kg");
  const [pesoKg, setPesoKg] = useState(pesoInicialKg ?? PESO_INICIAL_KG);

  const fator = unidade === "kg" ? 1 : KG_PARA_LB;
  const valorExibido = arredondarUmaCasa(pesoKg * fator);
  const minimo = arredondarUmaCasa(PESO_MINIMO_KG * fator);
  const maximo = arredondarUmaCasa(PESO_MAXIMO_KG * fator);

  return (
    <div className="flex flex-1 flex-col">
      <input type="hidden" name="pesoKg" value={pesoKg.toFixed(1)} />

      <div
        className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-surface p-1"
        aria-label="Unidade de peso"
      >
        {(["lb", "kg"] as const).map((opcao) => {
          const selecionada = unidade === opcao;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={selecionada}
              onClick={() => setUnidade(opcao)}
              className={`h-11 rounded-lg text-body-md font-semibold transition-colors ${
                selecionada
                  ? "bg-on-surface-strong text-background"
                  : "text-muted-foreground hover:text-on-surface"
              }`}
            >
              {opcao === "kg" ? "Quilogramas" : "Libras"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        <p
          aria-hidden="true"
          className="text-[2.75rem] leading-none font-bold tabular-nums text-on-surface-strong"
        >
          {valorExibido.toFixed(1)} {unidade}
        </p>

        <RoletaValor
          // A troca de unidade remonta a roleta: mínimo, máximo e escala mudam
          // juntos, e reiniciar é mais barato (e mais previsível) que
          // reconciliar a posição fracionária entre duas escalas.
          key={unidade}
          eixo="x"
          rotulo={`Peso em ${unidade === "kg" ? "quilogramas" : "libras"}`}
          minimo={minimo}
          maximo={maximo}
          passo={0.1}
          valorInicial={valorExibido}
          aoMudar={(valor) => setPesoKg(arredondarUmaCasa(valor / fator))}
          passoPx={14}
          // Rótulo só nas unidades inteiras: os décimos ficam como traços.
          formatarRotulo={(valor) =>
            Math.abs(valor - Math.round(valor)) < 0.05
              ? `${Math.round(valor)}`
              : null
          }
          descreverValor={(valor) => `${valor.toFixed(1)} ${unidade}`}
          className="h-40 w-[calc(100%+3rem)] max-w-md rounded-xl"
        />
      </div>

      <p className="mb-2 text-center text-body-sm text-muted-foreground">
        Deslize para os lados ou use as setas para ajustar.
      </p>
    </div>
  );
}
