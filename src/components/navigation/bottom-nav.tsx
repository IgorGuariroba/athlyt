"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navegação de topo em 4 abas — Início, Diário, Progresso, Mais —
 * fixada como bottom navigation (DESIGN.md > Components > Bottom
 * navigation; specs/workflow.md > Decisões estruturais).
 */
const ABAS = [
  { href: "/inicio", label: "Início" },
  { href: "/diario", label: "Diário" },
  { href: "/progresso", label: "Progresso" },
  { href: "/mais", label: "Mais" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-10 flex h-16 shrink-0 items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
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
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
