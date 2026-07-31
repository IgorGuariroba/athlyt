import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ETAPAS_TRIAGEM } from "@/domain/triagem/etapas";

/**
 * Moldura visual comum da cascata: barra de progresso + título +
 * conteúdo da pergunta (specs/workflow/telas 005–023, todas "uma
 * pergunta por tela" com barra de progresso).
 */
export function CascataShell({
  titulo,
  indice,
  total,
  children,
}: {
  titulo: string;
  indice: number;
  total: number;
  children: React.ReactNode;
}) {
  const etapaAnterior = indice > 1 ? ETAPAS_TRIAGEM[indice - 2] : null;
  const destinoAnterior = etapaAnterior
    ? `/triagem/${etapaAnterior.id}`
    : "/triagem";

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href={destinoAnterior}
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <div className="flex flex-col gap-2">
        <Progress value={(indice / total) * 100} />
        <p className="text-body-sm text-muted-foreground">
          Etapa {indice} de {total}
        </p>
      </div>

      <h1 className="text-headline-md font-bold text-on-surface-strong">
        {titulo}
      </h1>

      {children}
    </main>
  );
}
