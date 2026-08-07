import { cn } from "@/lib/utils";

/**
 * Título de uma seção dentro de uma tela, com ação/filtro opcional à
 * direita (DESIGN.md > Typography > Hierarquia: `title` para "cards,
 * seções e modais").
 *
 * Existe porque `h2` solto em página vinha com escalas divergentes —
 * inclusive `text-title-lg`, que não é um token do sistema e caía no
 * tamanho padrão de 16px sem ninguém perceber.
 */
export function CabecalhoSecao({
  id,
  titulo,
  descricao,
  acao,
  className,
}: {
  id?: string;
  titulo: string;
  descricao?: string;
  /** Filtro ou ação secundária alinhada ao título. */
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    // `flex-wrap` com base mínima no título: quando a ação é larga —
    // um segmented control de três períodos, por exemplo — ela desce
    // inteira para a linha seguinte em vez de espremer o título em
    // duas linhas de uma palavra.
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-3 gap-y-2",
        className,
      )}
    >
      <div className="min-w-0 flex-1 basis-48">
        <h2 id={id} className="text-title font-bold text-on-surface-strong">
          {titulo}
        </h2>
        {descricao ? (
          <p className="mt-1 text-body-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acao}
    </div>
  );
}
