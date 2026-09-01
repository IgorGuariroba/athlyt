import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Segmented control de 2–6 opções curtas: trilho em superfície de
 * cartão, opção ativa em superfície elevada com texto forte e opção
 * inativa em `muted`.
 *
 * Navega por `Link` porque o estado que ele alterna — período de um
 * gráfico, subview — pertence à URL: a tela continua endereçável e
 * renderizável no servidor, sem estado de cliente para um controle de
 * três botões.
 *
 * A semântica é de grupo de navegação com `aria-current`, e não de
 * `tablist`: não há painel controlado no cliente, a página inteira é
 * re-renderizada.
 */
export function ControleSegmentado({
  rotulo,
  opcoes,
  className,
}: {
  /** Nome acessível do grupo — o que está sendo alternado. */
  rotulo: string;
  opcoes: readonly { valor: string; rotulo: string; href: string; ativo: boolean }[];
  className?: string;
}) {
  return (
    <nav
      aria-label={rotulo}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-pill border border-border bg-surface-container p-1",
        className,
      )}
    >
      {opcoes.map((opcao) => (
        <Link
          key={opcao.valor}
          href={opcao.href}
          aria-current={opcao.ativo ? "page" : undefined}
          className={cn(
            "flex h-8 items-center rounded-pill px-3 text-label-md tabular-nums transition-colors",
            opcao.ativo
              ? "bg-surface-container-high text-on-surface-strong"
              : "text-muted-foreground hover:text-on-surface",
          )}
        >
          {opcao.rotulo}
        </Link>
      ))}
    </nav>
  );
}
