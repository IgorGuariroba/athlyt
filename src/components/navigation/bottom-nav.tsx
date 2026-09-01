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
 * demais configurações vivem sob Mais.
 *
 * Flutua acima de `--safe-bottom`, mantendo distância do indicador de
 * início do aparelho. O casco reserva sua altura mais esse afastamento
 * para que a bolha não cubra o fim do conteúdo.
 *
 * Apenas a aba ativa revela o rótulo. As quatro abas ocupam colunas de
 * mesma largura, reservando o espaço da seleção e evitando que a bolha
 * mude de tamanho entre rotas. As demais conservam seu nome acessível e
 * todas mantêm alvo de toque mínimo de 44px.
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
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--safe-bottom))] z-10 flex justify-center px-2"
    >
      <div className="pointer-events-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-2xl border border-border bg-surface/80 p-1.5 shadow-xl backdrop-blur-xl">
        {ABAS.map((aba) => {
          const ativo = pathname.startsWith(aba.href);
          return (
            <Link
              key={aba.href}
              href={aba.href}
              aria-current={ativo ? "page" : undefined}
              aria-label={ativo ? undefined : aba.label}
              className={cn(
                "flex min-h-13 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-caption transition-colors duration-300 motion-reduce:transition-none",
                ativo
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <aba.Icone
                aria-hidden="true"
                className={cn(
                  "size-6 transition-transform duration-300 motion-reduce:transition-none",
                  ativo && "scale-105",
                )}
                strokeWidth={ativo ? 2.5 : 2}
              />
              {ativo && <span className="whitespace-nowrap">{aba.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
