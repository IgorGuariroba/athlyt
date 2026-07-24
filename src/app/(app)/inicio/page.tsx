import Link from "next/link";
import { auth } from "@/auth";
import { sair } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";

/**
 * Casco da aba Início (telas 029–031). Os cartões de treino do dia,
 * check-in e próxima refeição chegam nos tickets seguintes; este
 * ticket entrega o estado do Modo Conservador (tela 031) derivado do
 * perfil de triagem (user stories 14, 15).
 */
export default async function InicioPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const perfil = userId ? await obterPerfilVigente(userId) : null;
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-headline-md font-bold text-on-surface-strong">
            Início
          </h1>
          {resumo.modoConservador ? (
            <Badge variant="secondary">Modo Conservador</Badge>
          ) : null}
        </div>
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

      {resumo.modoConservador ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-body-md text-on-surface">
            Complete seu perfil para sair do Modo Conservador. Enquanto isso,
            você recebe apenas orientações de baixo risco.
          </p>
          <ul className="flex flex-col gap-1">
            {resumo.itens
              .filter((item) => item.obrigatoria && !item.respondida)
              .map((item) => (
                <li key={item.id} className="text-body-sm text-muted-foreground">
                  {item.titulo} — {item.destrava}
                </li>
              ))}
          </ul>
          <Button asChild size="sm" className="w-fit">
            <Link href="/triagem">Completar perfil</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
