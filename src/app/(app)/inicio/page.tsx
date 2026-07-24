import { auth } from "@/auth";
import { sair } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Casco da aba Início (telas 029–031). Este ticket entrega apenas a
 * estrutura navegável — os cartões reais (treino do dia, check-in,
 * próxima refeição…) chegam no ticket "Triagem em cascata, perfil
 * versionado e Modo Conservador" e nos seguintes.
 */
export default async function InicioPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Início
        </h1>
        <form action={sair}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </header>

      <Card className="p-4 text-body-md text-muted-foreground">
        Olá, {session?.user?.name ?? session?.user?.email}. Seus cartões de
        prioridade do dia vão aparecer aqui.
      </Card>
    </div>
  );
}
