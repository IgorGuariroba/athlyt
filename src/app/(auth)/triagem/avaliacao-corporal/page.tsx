import Link from "next/link";
import { ChevronLeft, Ruler, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tela 008a — oferta da Avaliação Corporal Inicial
 * (specs/workflow/telas/008a-avaliacao-corporal-oferta.md).
 *
 * Segue a moldura visual da cascata (`_components/cascata-shell.tsx`):
 * fundo `background`, margens de 24px, voltar circular no topo e CTA
 * principal ao pé da tela. Os benefícios usam o cartão com divisores
 * de 1px do sistema, e não cartões soltos, porque pertencem à mesma
 * unidade de informação.
 */

const BENEFICIOS = [
  {
    Icone: Scale,
    titulo: "Composição corporal",
    descricao: "Cintura, pescoço e quadril melhoram a leitura da estratégia alimentar.",
  },
  {
    Icone: Ruler,
    titulo: "Proporções e simetria",
    descricao: "O conjunto completo orienta ênfases do treino, sem nota corporal.",
  },
  {
    Icone: Sparkles,
    titulo: "Sem bloqueio",
    descricao: "Você pode continuar sem concluir tudo e voltar quando quiser.",
  },
] as const;

export default function AvaliacaoCorporalPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href="/triagem/peso"
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
          Avaliação Corporal Inicial
        </p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Personalize com sua linha de base
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          Medidas reproduzíveis melhoram as prioridades do treino e a leitura da
          estratégia alimentar.
        </p>
      </header>

      <section
        aria-label="O que cada medida libera"
        className="overflow-hidden rounded-2xl border border-border bg-surface-container"
      >
        <ul className="grid gap-px bg-border">
          {BENEFICIOS.map(({ Icone, titulo, descricao }) => (
            <li key={titulo} className="flex gap-4 bg-background px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-strong">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <strong className="text-title text-on-surface-strong">
                  {titulo}
                </strong>
                <span className="text-body-sm text-muted-foreground">
                  {descricao}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <p className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
          Enquanto faltarem medidas, o Modo Conservador limita apenas as
          capacidades relacionadas — seu plano provisório continua disponível.
        </p>
        <Button asChild size="lg" className="h-12 w-full">
          <Link href="/triagem/avaliacao-corporal/essenciais">
            Começar medidas essenciais
          </Link>
        </Button>
        <Button asChild variant="ghost" className="h-12 w-full">
          <Link href="/triagem/objetivo">Fazer depois</Link>
        </Button>
      </div>
    </main>
  );
}
