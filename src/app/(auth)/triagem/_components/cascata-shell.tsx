import { Progress } from "@/components/ui/progress";

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
  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
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
