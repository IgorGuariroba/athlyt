"use client";

import { BookOpen, ChartLine, Ellipsis, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navegação de topo em 4 abas — Início, Diário, Progresso, Mais —
 * fixada como bottom navigation (DESIGN.md > Components > Bottom
 * navigation; specs/workflow.md > Decisões estruturais).
 *
 * Não usa `sticky`: a nav é irmã do `<main>` rolável dentro de um casco
 * de altura fixa, então basta `shrink-0`. Enquanto era `sticky`, a
 * rolagem pertencia ao documento e a barra descia com ele, ficando
 * atrás da barra do navegador.
 *
 * O padding inferior sai do token `--safe-bottom` (globals.css) em vez
 * de `env()` inline: assim o E2E consegue injetar insets reais, já que
 * navegador de teste resolve `env(safe-area-inset-*)` sempre como `0px`.
 *
 * A altura soma o inset em vez de ser `h-16` fixa. Com `border-box`,
 * altura fixa mais `padding-bottom` não empurra a barra para cima: o
 * padding é descontado por dentro. No iPhone, os 34pt do indicador de
 * home reduziam a faixa tocada de 64pt para 30pt — abaixo do mínimo de
 * 44pt de DESIGN.md > Accessibility.
 */
const ABAS = [
  { href: "/inicio", label: "Início", Icone: House },
  { href: "/diario", label: "Diário", Icone: BookOpen },
  { href: "/progresso", label: "Progresso", Icone: ChartLine },
  { href: "/mais", label: "Mais", Icone: Ellipsis },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="z-10 flex h-[calc(4rem+var(--safe-bottom))] shrink-0 items-stretch border-t border-border bg-surface pb-[var(--safe-bottom)]"
    >
      {ABAS.map((aba) => {
        const ativo = pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-label-md",
              ativo ? "text-on-surface-strong" : "text-muted-foreground",
            )}
          >
            <aba.Icone aria-hidden="true" className="size-5" />
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
