import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ItemPendencia {
  id: string;
  titulo: string;
  descricao: string;
}

/**
 * Estado persistente que explica por que uma capacidade ainda está limitada
 * e conduz à ação que resolve as pendências.
 *
 * A composição segue as listas densas do MacroFactor (referência 147): uma
 * única superfície, linhas homogêneas separadas por divisores e ação larga no
 * rodapé. Manter essa decisão aqui evita que páginas recriem avisos como texto
 * corrido dentro de um Card genérico.
 */
export function PainelPendencias({
  titulo,
  descricao,
  itens,
  acao,
  className,
}: {
  titulo: string;
  descricao: string;
  itens: readonly ItemPendencia[];
  acao: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="painel-pendencias-titulo"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface-container",
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-strong">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="painel-pendencias-titulo"
            className="text-title font-bold text-on-surface-strong"
          >
            {titulo}
          </h2>
          <p className="mt-1 text-body-md text-muted-foreground">{descricao}</p>
        </div>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {itens.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <strong className="block text-label-lg text-on-surface-strong">
              {item.titulo}
            </strong>
            <p className="text-body-sm text-muted-foreground">
              {item.descricao}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t border-border bg-surface-container-high p-3 [&>*]:w-full">
        {acao}
      </div>
    </section>
  );
}
