import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Campo de escolha única em lista fechada.
 *
 * Envolve um `<select>` nativo em vez de recriar o menu: no alvo do
 * produto — um app móvel — a roda nativa do iOS/Android é mais rápida
 * de operar que qualquer popover desenhado, funciona com leitor de
 * tela sem trabalho extra e envia o valor no `FormData` de uma Server
 * Action sem estado de cliente.
 *
 * O que o nativo **não** entrega, e por isso vive aqui: altura de 48px
 * (DESIGN.md > Components > Input), superfície de cartão, e o chevron
 * da família de ícones do produto no lugar da seta do sistema
 * operacional — que é o detalhe que denunciava o controle como
 * "formulário web" no meio de uma interface móvel.
 *
 * `appearance-none` remove o desenho nativo; o `<select>` continua
 * empilhado sobre o chevron, então o toque em qualquer ponto do campo
 * abre a lista.
 */
export function CampoSelecao({
  id,
  name,
  rotulo,
  descricao,
  opcoes,
  defaultValue,
  compacto = false,
  className,
  ...props
}: Omit<React.ComponentProps<"select">, "children"> & {
  rotulo: string;
  /** Texto auxiliar abaixo do campo — nunca informação crítica. */
  descricao?: string;
  opcoes: readonly { valor: string; rotulo: string }[];
  /**
   * Reduz o campo a 36px e o rótulo a `caption`, para filtros lado a
   * lado onde o controle é acessório da leitura — não uma pergunta do
   * formulário (DESIGN.md > Components > Button: `compact-height`).
   */
  compacto?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-on-surface-strong",
          compacto ? "text-caption text-muted-foreground" : "text-label-lg",
        )}
      >
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          className={cn(
            "w-full appearance-none rounded-md border border-border bg-surface-container text-on-surface transition-colors",
            compacto
              ? "h-9 px-2.5 pr-8 text-body-sm"
              : "h-12 px-3 pr-10 text-body-lg",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          {...props}
        >
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
            compacto ? "right-2 size-4" : "right-3 size-5",
          )}
        />
      </div>
      {descricao ? (
        <p className="text-body-sm text-muted-foreground">{descricao}</p>
      ) : null}
    </div>
  );
}
