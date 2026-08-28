"use client";

import { ChartLine, Dumbbell, Ellipsis, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navegação de topo em 4 abas — Dieta, Treino, Progresso, Mais —
 * fixada como bottom navigation.
 *
 * Dieta vem primeiro por frequência de uso: é a aba tocada várias
 * vezes por dia. Diário (o extrato cronológico completo do dia) e as
 * demais configurações vivem sob Mais (DESIGN.md > Components > Bottom
 * navigation; specs/workflow.md > Decisões estruturais).
 *
 * Fica `fixed` na viewport para não depender do tamanho calculado pelo
 * casco quando uma tela longa cresce. O `<main>` reserva a mesma altura
 * no padding inferior, então a barra não cobre o último conteúdo.
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
  { href: "/dieta", label: "Dieta", Icone: UtensilsCrossed },
  { href: "/treino", label: "Treino", Icone: Dumbbell },
  { href: "/progresso", label: "Progresso", Icone: ChartLine },
  { href: "/mais", label: "Mais", Icone: Ellipsis },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex h-[calc(4rem+var(--safe-bottom))] items-stretch border-t border-border bg-surface pb-[var(--safe-bottom)]"
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
