import { ChevronDown, type LucideIcon } from "lucide-react";

/**
 * Disclosure padrão do produto: rótulo `muted` com chevron que gira ao
 * abrir. Existe porque o marcador nativo do `<details>` é um triângulo
 * do sistema operacional — mistura família de ícones e quebra o peso
 * uniforme exigido em DESIGN.md > Iconography.
 *
 * `Icone` troca o chevron quando a ação, e não o conteúdo, é o assunto
 * do disclosure (ex.: "Trocar exercício"); nesse caso não há rotação,
 * porque um ícone de ação girando não comunica estado.
 *
 * `aberto` define o estado inicial e `tom="forte"` promove o rótulo a
 * título de bloco, para telas densas (ex.: auditoria) em que o
 * disclosure organiza a hierarquia em vez de apenas esconder um detalhe.
 */
export function Revelar({
  rotulo,
  Icone,
  aberto = false,
  tom = "discreto",
  meta,
  children,
}: {
  rotulo: string;
  Icone?: LucideIcon;
  aberto?: boolean;
  tom?: "discreto" | "forte";
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="group" open={aberto}>
      <summary
        className={
          tom === "forte"
            ? "flex cursor-pointer list-none items-center gap-1.5 text-label-lg text-on-surface-strong marker:content-none"
            : "flex cursor-pointer list-none items-center gap-1.5 text-label-md text-muted-foreground marker:content-none hover:text-on-surface"
        }
      >
        {Icone ? (
          <Icone className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{rotulo}</span>
        {meta ? (
          <span className="shrink-0 text-label-md text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </summary>
      <div
        className={
          Icone
            ? "mt-3 text-body-sm leading-relaxed text-muted-foreground"
            : "mt-2 pl-[1.375rem] text-body-sm leading-relaxed text-muted-foreground"
        }
      >
        {children}
      </div>
    </details>
  );
}
