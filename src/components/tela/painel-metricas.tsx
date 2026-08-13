import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Faixa de 2 a 4 métricas de resumo, lado a lado, separadas por
 * divisor de 1px.
 *
 * É o padrão de "números da sessão" do MacroFactor — ver os cartões
 * "Expenditure / Weight Trend" e a faixa de totais do dashboard: valor
 * grande e tabular, rótulo pequeno abaixo, ícone discreto acima.
 *
 * O divisor sai do `gap` sobre um fundo `border`: uma borda por célula
 * duplicaria a linha entre vizinhas, e `divide-x` não acompanha quebra
 * de linha quando são quatro colunas em telas estreitas.
 *
 * O valor usa `headline-md` porque é a métrica dominante da região —
 * `display` seria a escala de uma tela inteira dedicada a um número,
 * não de uma faixa com três deles.
 */
export function PainelMetricas({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Metrica({
  Icone,
  valor,
  unidade,
  rotulo,
}: {
  Icone?: LucideIcon;
  valor: React.ReactNode;
  /** Unidade junto do valor, em escala menor (DESIGN.md > Typography). */
  unidade?: string;
  rotulo: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-surface-container px-2 py-4 text-center">
      {Icone ? (
        <Icone aria-hidden="true" className="size-5 text-muted-foreground" />
      ) : null}
      <strong className="text-headline-md tabular-nums text-on-surface-strong">
        {valor}
        {unidade ? (
          <span className="text-body-sm font-normal text-muted-foreground">
            {unidade}
          </span>
        ) : null}
      </strong>
      <span className="text-caption text-muted-foreground">{rotulo}</span>
    </div>
  );
}
