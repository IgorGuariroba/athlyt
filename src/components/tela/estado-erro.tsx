import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Estado terminal de uma etapa que não conseguiu continuar.
 *
 * Diferente de `AvisoAcao`, que responde junto a um controle específico,
 * este componente ocupa a região principal da tela: explica o ocorrido,
 * confirma o registro técnico e oferece uma única recuperação. A cor de
 * erro fica restrita ao ícone e ao indicador de estado, sem transformar
 * toda a superfície em alerta.
 */
export function EstadoErro({
  titulo,
  descricao,
  statusTitulo = "Erro registrado",
  statusDescricao,
  referencia,
  acao,
  ajuda,
  Icone = AlertTriangle,
  className,
}: {
  titulo: string;
  descricao: string;
  statusTitulo?: string;
  statusDescricao: string;
  referencia?: string;
  acao: React.ReactNode;
  ajuda?: string;
  Icone?: LucideIcon;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="titulo-estado-erro"
      className={cn("flex flex-1 flex-col justify-center py-10", className)}
    >
      <div className="mb-6 flex size-12 items-center justify-center rounded-lg border border-error/40 bg-surface-container">
        <Icone
          aria-hidden="true"
          className="size-6 text-error"
          strokeWidth={1.75}
        />
      </div>

      <h1
        id="titulo-estado-erro"
        className="max-w-sm text-headline-lg text-on-surface-strong"
      >
        {titulo}
      </h1>
      <p className="mt-3 max-w-sm text-body-lg text-muted-foreground">
        {descricao}
      </p>

      <div className="mt-8 rounded-xl border border-border bg-surface-container px-4 py-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1.5 size-2 shrink-0 rounded-full bg-error"
          />
          <div className="min-w-0">
            <p className="text-label-lg font-semibold text-on-surface-strong">
              {statusTitulo}
            </p>
            <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
              {statusDescricao}
            </p>
          </div>
        </div>

        {referencia ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-caption text-muted-foreground">
              Referência do erro
            </p>
            <code className="mt-1 block truncate text-body-sm text-on-surface">
              {referencia}
            </code>
          </div>
        ) : null}
      </div>

      <div className="mt-8 w-full">{acao}</div>
      {ajuda ? (
        <p className="mt-3 text-center text-body-sm text-muted-foreground">
          {ajuda}
        </p>
      ) : null}
    </section>
  );
}
