import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lista de destinos: ícone, rótulo e chevron, agrupados em um cartão
 * com divisores de 1px.
 *
 * É o padrão de navegação secundária do MacroFactor — ver
 * `workflow-imagens-references/macrofactor/147-mais-configuracoes.JPG`,
 * onde "Dashboard / Food Log / Shortcuts / Expenditure…" formam um
 * único cartão de linhas, não uma pilha de cartões.
 *
 * Existe porque a tela "Mais" vinha montando um cartão por destino,
 * cada um com descrição e um `Button` dentro. Isso triplica a altura,
 * repete a superfície elevada para relações idênticas — o que DESIGN.md
 * > Layout proíbe explicitamente ("nunca use simultaneamente divisor
 * forte, grande gap e superfície contrastante para separar a mesma
 * relação") — e transforma navegação em ação, quando o destino é só
 * outra tela.
 *
 * A linha inteira é o alvo de toque (52px mínimo, acima dos 44px de
 * DESIGN.md > Accessibility), e não um botão dentro do cartão.
 */
export function ListaNavegacao({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface-container",
        className,
      )}
    >
      <ul className="divide-y divide-border">{children}</ul>
    </nav>
  );
}

/** Ação de conta apresentada com a mesma densidade dos destinos da lista. */
export function ItemAcaoNavegacao({
  acao,
  Icone,
  rotulo,
  descricao,
  destrutivo = false,
}: {
  acao: React.ComponentProps<"form">["action"];
  Icone?: LucideIcon;
  rotulo: string;
  descricao?: string;
  destrutivo?: boolean;
}) {
  return (
    <li>
      <form action={acao}>
        <button
          type="submit"
          className={cn(
            "flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none",
            destrutivo ? "text-error" : "text-on-surface-strong",
          )}
        >
          {Icone ? <Icone aria-hidden="true" className="size-5 shrink-0" /> : null}
          <span className="min-w-0 flex-1">
            <span className="block text-body-lg">{rotulo}</span>
            {descricao ? (
              <span className="block text-body-sm text-muted-foreground">
                {descricao}
              </span>
            ) : null}
          </span>
        </button>
      </form>
    </li>
  );
}

/**
 * Um destino da lista. `descricao` é opcional e deve ser curta: se
 * precisar de um parágrafo para explicar o destino, o assunto é uma
 * seção com `CabecalhoSecao`, não um item de lista.
 */
export function ItemNavegacao({
  href,
  Icone,
  rotulo,
  descricao,
  valor,
}: {
  href: string;
  Icone?: LucideIcon;
  rotulo: string;
  descricao?: string;
  /** Estado atual do destino, alinhado antes do chevron (ex.: "kg"). */
  valor?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none"
      >
        {Icone ? (
          <Icone
            aria-hidden="true"
            className="size-5 shrink-0 text-on-surface-strong"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-body-lg text-on-surface-strong">
            {rotulo}
          </span>
          {descricao ? (
            <span className="block text-body-sm text-muted-foreground">
              {descricao}
            </span>
          ) : null}
        </span>
        {valor ? (
          <span className="shrink-0 text-body-md tabular-nums text-muted-foreground">
            {valor}
          </span>
        ) : null}
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  );
}
