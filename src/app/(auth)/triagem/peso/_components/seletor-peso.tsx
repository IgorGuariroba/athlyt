"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const KG_PARA_LB = 2.2046226218;
const PESO_INICIAL_KG = 75;

type Unidade = "kg" | "lb";

function arredondarUmaCasa(valor: number) {
  return Math.round(valor * 10) / 10;
}

export function SeletorPeso() {
  const [unidade, setUnidade] = useState<Unidade>("kg");
  const [pesoKg, setPesoKg] = useState(PESO_INICIAL_KG);
  const inicioArraste = useRef<{ x: number; valor: number } | null>(null);

  const fator = unidade === "kg" ? 1 : KG_PARA_LB;
  const valorExibido = arredondarUmaCasa(pesoKg * fator);
  const minimo = arredondarUmaCasa(30 * fator);
  const maximo = arredondarUmaCasa(300 * fator);
  const marcadores = Array.from(
    { length: 5 },
    (_, indice) => Math.round(valorExibido) + indice - 2,
  );

  function selecionarUnidade(novaUnidade: Unidade) {
    setUnidade(novaUnidade);
  }

  function atualizarPesoExibido(valor: number) {
    const valorLimitado = Math.min(maximo, Math.max(minimo, valor));
    setPesoKg(arredondarUmaCasa(valorLimitado / fator));
  }

  function iniciarArraste(evento: PointerEvent<HTMLDivElement>) {
    inicioArraste.current = { x: evento.clientX, valor: valorExibido };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function arrastar(evento: PointerEvent<HTMLDivElement>) {
    if (!inicioArraste.current) return;

    const deslocamento = (inicioArraste.current.x - evento.clientX) / 8;
    atualizarPesoExibido(
      arredondarUmaCasa(inicioArraste.current.valor + deslocamento),
    );
  }

  function terminarArraste(evento: PointerEvent<HTMLDivElement>) {
    inicioArraste.current = null;
    evento.currentTarget.releasePointerCapture(evento.pointerId);
  }

  function ajustarComTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    const direcao =
      evento.key === "ArrowRight" || evento.key === "ArrowUp"
        ? 1
        : evento.key === "ArrowLeft" || evento.key === "ArrowDown"
          ? -1
          : 0;

    if (direcao !== 0) {
      evento.preventDefault();
      atualizarPesoExibido(arredondarUmaCasa(valorExibido + direcao * 0.1));
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <input type="hidden" name="pesoKg" value={pesoKg.toFixed(1)} />

      <div
        className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-xl bg-surface p-1"
        aria-label="Unidade de peso"
      >
        {(["kg", "lb"] as const).map((opcao) => {
          const selecionada = unidade === opcao;
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={selecionada}
              onClick={() => selecionarUnidade(opcao)}
              className={`h-11 rounded-lg text-body-lg font-semibold transition-colors ${
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

      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <output
          aria-live="polite"
          className="mb-8 text-[2.5rem] leading-none font-bold tracking-tight text-on-surface-strong tabular-nums"
        >
          {valorExibido.toFixed(1)} <span className="text-headline-md">{unidade}</span>
        </output>

        <div
          role="slider"
          tabIndex={0}
          aria-label={`Peso em ${unidade === "kg" ? "quilogramas" : "libras"}`}
          aria-valuemin={minimo}
          aria-valuemax={maximo}
          aria-valuenow={valorExibido}
          aria-valuetext={`${valorExibido.toFixed(1)} ${unidade}`}
          onPointerDown={iniciarArraste}
          onPointerMove={arrastar}
          onPointerUp={terminarArraste}
          onPointerCancel={terminarArraste}
          onKeyDown={ajustarComTeclado}
          className="relative w-[calc(100%+3rem)] max-w-md touch-none cursor-ew-resize overflow-hidden py-8 select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-border-strong"
        >
          <div className="pointer-events-none flex justify-around px-5">
            {marcadores.map((marcador, indice) => (
              <div key={`${marcador}-${indice}`} className="flex flex-col items-center gap-3">
                <span
                  className={`text-body-sm tabular-nums ${
                    indice === 2 ? "text-on-surface" : "text-muted-foreground"
                  }`}
                >
                  {marcador}
                </span>
                <span
                  className={`block w-px ${
                    indice === 2 ? "h-16 bg-success" : "h-9 bg-border-strong"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 max-w-xs text-center text-body-sm text-muted-foreground">
          Deslize a régua ou use as setas para ajustar o valor.
        </p>
      </div>
    </div>
  );
}
