import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão de uma tela de conteúdo: contexto (eyebrow),
 * título e explicação curta, na ordem da hierarquia espacial de
 * DESIGN.md > Layout ("título/contexto" antes de tudo).
 *
 * O eyebrow é o único lugar do produto onde caixa alta é aceita: ele
 * é rótulo de seção, não título (DESIGN.md > Typography > Regras —
 * "títulos do app usam sentence case").
 *
 * `voltar` cobre as telas de segundo nível. Cada uma vinha montando o
 * próprio `<header>` com um `Button` fantasma e um `ChevronLeft` solto,
 * em quatro variações de espaçamento e alinhamento. Como afordância de
 * retorno, o alvo precisa de duas garantias que se perdem quando é
 * remontado à mão: 44px de área tocável (DESIGN.md > Accessibility) e
 * alinhamento com a primeira linha do título, não com o bloco inteiro.
 */
export function CabecalhoTela({
  contexto,
  titulo,
  descricao,
  acao,
  voltar,
  className,
}: {
  contexto?: string;
  titulo: string;
  descricao?: string;
  /** Ação secundária alinhada ao contexto — badge, link ou botão. */
  acao?: React.ReactNode;
  /** Destino do retorno. Omita nas telas de primeiro nível (abas). */
  voltar?: { href: string; rotulo: string };
  className?: string;
}) {
  const cabecalho = (
    <>
      {contexto || acao ? (
        <div className="flex items-center justify-between gap-3">
          {contexto ? (
            <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
              {contexto}
            </p>
          ) : (
            <span />
          )}
          {acao}
        </div>
      ) : null}
      <h1 className="font-brand text-[2rem] leading-tight font-bold tracking-tight text-on-surface-strong">
        {titulo}
      </h1>
      {descricao ? (
        <p className="text-body-md leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      ) : null}
    </>
  );

  if (!voltar) {
    return (
      <header className={cn("flex flex-col gap-3 px-6 pt-8 pb-6", className)}>
        {cabecalho}
      </header>
    );
  }

  return (
    <header className={cn("flex gap-2 px-6 pt-8 pb-6", className)}>
      {/* `-ml-2` recua o alvo de 44px para que o ícone — e não a
          margem invisível ao redor dele — fique alinhado à margem
          lateral da tela. */}
      <Link
        href={voltar.href}
        aria-label={voltar.rotulo}
        className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:text-on-surface focus-visible:text-on-surface focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden="true" className="size-6" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1.5">
        {cabecalho}
      </div>
    </header>
  );
}
