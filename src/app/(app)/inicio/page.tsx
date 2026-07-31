import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { auth } from "@/auth";
import { sair } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";

/**
 * Casco da aba Início (telas 029–031). Os cartões de treino do dia,
 * check-in e próxima refeição chegam nos tickets seguintes; este
 * ticket entrega o estado do Modo Conservador (tela 031) derivado do
 * perfil de triagem (user stories 14, 15).
 */
export default async function InicioPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [perfil, planoAtivo] = userId
    ? await Promise.all([obterPerfilVigente(userId), obterPlanoAtivo(userId)])
    : [null, null];
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

      {planoAtivo ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <strong>Plano Ativo v{planoAtivo.versao}</strong>
            <Badge>{planoAtivo.conteudo.bloco.duracaoSemanas} semanas</Badge>
          </div>
          <p className="text-body-md text-on-surface">
            {planoAtivo.conteudo.bloco.dias.length} treinos por semana · {planoAtivo.conteudo.nutricao.calorias} kcal por dia
          </p>
          <p className="text-body-sm text-muted-foreground">
            {planoAtivo.conteudo.bloco.divisao}
          </p>
        </Card>
      ) : !resumo.modoConservador ? (
        <section
          aria-labelledby="plano-pronto-titulo"
          className="flex flex-col overflow-hidden rounded-2xl border-2 border-border-strong bg-surface-container"
        >
          <div className="flex flex-col gap-5 p-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-on-surface-strong text-background">
              <Dumbbell className="size-6" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                Próxima etapa
              </p>
              <h2
                id="plano-pronto-titulo"
                className="text-headline-sm font-bold text-on-surface-strong"
              >
                Seu perfil está pronto
              </h2>
              <p className="text-body-md leading-relaxed text-muted-foreground">
                Vamos montar seu Bloco de Treino e suas metas nutricionais com
                base nas respostas da triagem.
              </p>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="h-14 w-full rounded-none text-base font-bold"
          >
            <Link href="/plano/gerando">
              Gerar meu Plano Ativo
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      ) : null}

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
            <Link href="/triagem?retomar=1">Completar perfil</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
