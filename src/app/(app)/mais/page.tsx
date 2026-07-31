import Link from "next/link";
import { auth } from "@/auth";
import { sair, sairDeTodosDispositivos } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Casco da aba Mais (telas 075–085). Perfil, Trilhas de Decisão,
 * consentimentos, exportação e configurações chegam em tickets
 * posteriores (Importação de Histórico, privacidade e afins). Este
 * ticket entrega os controles de conta (user stories 1–4).
 */
export default async function MaisPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-headline-md font-bold text-on-surface-strong">
        Mais
      </h1>

      <Card className="p-4">
        <p className="text-body-md text-on-surface">
          {session?.user?.name ?? session?.user?.email}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {session?.user?.email}
        </p>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-body-md text-muted-foreground">
          Consulte os dados, regras e resultados que sustentaram as recomendações do Athlyt.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/mais/trilhas">Ver Trilhas de Decisão</Link>
        </Button>
      </Card>

      <div className="flex flex-col gap-2">
        <form action={sair}>
          <Button type="submit" variant="secondary" className="w-full">
            Sair
          </Button>
        </form>
        <form action={sairDeTodosDispositivos}>
          <Button type="submit" variant="ghost" className="w-full">
            Sair de todos os dispositivos
          </Button>
        </form>
      </div>
    </div>
  );
}
