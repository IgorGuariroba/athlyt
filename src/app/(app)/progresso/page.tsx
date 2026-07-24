import { Card } from "@/components/ui/card";

/**
 * Casco da aba Progresso (telas 064–074). O cartão de estratégia e os
 * gráficos configuráveis chegam no ticket "Aba Progresso: cartão de
 * estratégia e gráficos configuráveis".
 */
export default function ProgressoPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-headline-md font-bold text-on-surface-strong">
        Progresso
      </h1>
      <Card className="p-4 text-body-md text-muted-foreground">
        Seu plano ativo, contagem até a Revisão Semanal e gráficos vão
        aparecer aqui.
      </Card>
    </div>
  );
}
