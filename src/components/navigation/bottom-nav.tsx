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
      className="z-10 flex h-16 shrink-0 items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
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
