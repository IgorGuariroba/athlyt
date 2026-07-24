import { Card } from "@/components/ui/card";

/**
 * Casco da aba Diário (telas 045–058). A linha do tempo unificada do
 * dia chega no ticket "Diário: linha do tempo, Entradas Planejadas e
 * macros do dia".
 */
export default function DiarioPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-headline-md font-bold text-on-surface-strong">
        Diário
      </h1>
      <Card className="p-4 text-body-md text-muted-foreground">
        Sua linha do tempo de refeições, treinos e check-ins vai aparecer
        aqui.
      </Card>
    </div>
  );
}
