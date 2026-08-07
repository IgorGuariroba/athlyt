import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cartão que agrupa um conjunto de itens homogêneos separados por
 * divisor, e não uma pilha de cartões por item.
 *
 * É a tradução de duas regras de DESIGN.md que se reforçam: Components
 * > Card ("não transforme toda linha em card se divisores bastarem") e
 * Layout > Hierarquia espacial ("divisores substituem espaço quando
 * listas precisam ser densas; nunca use simultaneamente divisor forte,
 * grande gap e superfície contrastante para separar a mesma relação").
 */
export function CartaoLista({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface-container",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * Cabeçalho do cartão: indicador opcional à esquerda (posição na
 * sequência), título, metadados em uma linha e ícone de contexto à
 * direita.
 */
export function CabecalhoCartaoLista({
  id,
  indicador,
  titulo,
  meta,
  Icone,
}: {
  id?: string;
  indicador?: React.ReactNode;
  titulo: string;
  meta?: React.ReactNode;
  Icone?: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      {indicador !== undefined ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-body-md font-bold tabular-nums text-background">
          {indicador}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="truncate text-title font-bold text-on-surface-strong">
          {titulo}
        </h2>
        {meta ? (
          <p className="text-body-sm text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      {Icone ? (
        <Icone
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

/** Corpo do cartão: itens separados por divisor de 1px. */
export function LinhasCartaoLista({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>;
}

/**
 * Uma linha da lista. `valor` fica alinhado à direita e no topo —
 * é onde vive a métrica da linha (kcal, carga, total), separada do
 * conteúdo descritivo.
 */
export function LinhaCartaoLista({
  titulo,
  meta,
  valor,
  children,
}: {
  titulo: string;
  meta?: React.ReactNode;
  valor?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <strong className="text-label-lg text-on-surface-strong">
            {titulo}
          </strong>
          {meta ? (
            <p className="text-body-sm text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        {valor ? (
          <span className="shrink-0 text-label-lg tabular-nums text-on-surface-strong">
            {valor}
          </span>
        ) : null}
      </div>
      {children}
    </li>
  );
}

/**
 * Faixa de prescrição/dados dentro de uma linha: números tabulares em
 * superfície elevada, com unidade junto do valor (DESIGN.md >
 * Components > Text field: "unidades ficam próximas do valor").
 */
export function FaixaDados({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-surface-container-high px-3 py-2 text-body-sm font-semibold tabular-nums text-on-surface">
      {children}
    </p>
  );
}
