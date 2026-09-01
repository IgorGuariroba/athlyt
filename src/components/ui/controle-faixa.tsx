"use client";

import { cn } from "@/lib/utils";

/**
 * Deslizador de valor contínuo (`input[type=range]`) com o desenho do
 * produto: trilho em superfície elevada, preenchimento e polegar em
 * `on-surface-strong`.
 *
 * O `range` nativo é pintado pelo navegador com o azul do sistema
 * operacional e um trilho de altura fixa — em uma interface
 * dark-first, é o mesmo problema do `<progress>`: um controle que não
 * pertence a nenhuma superfície do produto.
 *
 * Não confundir com `RoletaValor`: a roleta é para grandezas precisas
 * onde cada tique importa (peso, altura), com física de tambor e
 * leitura numérica. Este controle é para ajuste aproximado e contínuo
 * de uma visualização — zoom, opacidade — onde o valor exato é
 * secundário e o gesto é de varredura.
 *
 * O polegar tem 20px visuais, mas mantém área tocável de 44px via
 * `::-webkit-slider-thumb`, sem engordar o trilho.
 */
export function ControleFaixa({
  id,
  rotulo,
  valor,
  aoMudar,
  minimo,
  maximo,
  passo = 1,
  formatarValor,
  className,
}: {
  id: string;
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  minimo: number;
  maximo: number;
  passo?: number;
  /** Exibição do valor ao lado do rótulo. */
  formatarValor?: (valor: number) => string;
  className?: string;
}) {
  const proporcao = (valor - minimo) / (maximo - minimo);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label-md text-muted-foreground">
          {rotulo}
        </label>
        <span className="text-body-sm tabular-nums text-on-surface">
          {formatarValor ? formatarValor(valor) : valor}
        </span>
      </div>
      {/* ui-excecao: primitivo do design system — este É o componente
          que encapsula o range nativo para todas as telas. */}
      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={passo}
        value={valor}
        onChange={(evento) => aoMudar(Number(evento.target.value))}
        className="h-11 w-full cursor-ew-resize appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-on-surface-strong [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-on-surface-strong"
        style={{
          // O preenchimento à esquerda do polegar sai de um gradiente
          // no próprio trilho: é a única forma de colori-lo sem um
          // elemento extra, já que o `range` não expõe a parte
          // percorrida em CSS padrão.
          background: `linear-gradient(to right, var(--on-surface-strong) ${proporcao * 100}%, var(--surface-container-high) ${proporcao * 100}%)`,
          backgroundSize: "100% 6px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "999px",
        }}
      />
    </div>
  );
}
