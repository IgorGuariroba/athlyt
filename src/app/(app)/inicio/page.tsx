import Link from "next/link";
import { ArrowRight, CalendarDays, Dumbbell, Flame } from "lucide-react";
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
        <>
        <section className="overflow-hidden rounded-2xl border-2 border-on-surface-strong bg-surface-container">
          <div className="p-5">
            <p className="mb-2 text-label-md font-semibold tracking-wide text-muted-foreground uppercase">Treino do dia</p>
            <h2 className="text-headline-md font-bold text-on-surface-strong">{planoAtivo.conteudo.bloco.dias[0].nome}</h2>
            <p className="mt-1 text-body-md text-muted-foreground">{planoAtivo.conteudo.bloco.dias[0].exercicios.length} exercícios · {planoAtivo.conteudo.bloco.dias[0].exercicios.reduce((total, exercicio) => total + exercicio.series, 0)} séries</p>
          </div>
          <Button asChild size="lg" className="h-14 w-full rounded-none text-base font-bold">
            <Link href={`/sessao/previa/${planoAtivo.conteudo.bloco.dias[0].id}`}>Ver treino <ArrowRight className="size-5" /></Link>
          </Button>
        </section>
        <section
          aria-labelledby="plano-ativo-titulo"
          className="overflow-hidden rounded-2xl border border-border bg-surface-container"
        >
          <div className="flex items-start justify-between p-5 pb-4">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-background">
                <Dumbbell className="size-5" aria-hidden="true" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#78b990]" />
                  <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                    Plano Ativo
                  </p>
                </div>
                <h2
                  id="plano-ativo-titulo"
                  className="text-title-lg font-bold text-on-surface-strong"
                >
                  {planoAtivo.conteudo.bloco.divisao}
                </h2>
              </div>
            </div>
            <span className="text-body-sm text-muted-foreground">
              v{planoAtivo.versao}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-background p-4">
              <CalendarDays
                className="mb-3 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <strong className="block text-headline-sm tabular-nums text-on-surface-strong">
                {planoAtivo.conteudo.bloco.duracaoSemanas} semanas
              </strong>
              <span className="text-body-sm text-muted-foreground">
                duração do bloco
              </span>
            </div>
            <div className="bg-background p-4">
              <Dumbbell
                className="mb-3 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <strong className="block text-headline-sm tabular-nums text-on-surface-strong">
                {planoAtivo.conteudo.bloco.dias.length}
              </strong>
              <span className="text-body-sm text-muted-foreground">
                treinos por semana
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-body-sm text-muted-foreground">
                  Meta nutricional
                </p>
                <strong className="text-headline-md tabular-nums text-on-surface-strong">
                  {planoAtivo.conteudo.nutricao.calorias} kcal
                </strong>
              </div>
              <Flame
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div
              className="flex h-3 overflow-hidden rounded-full bg-surface-container-high"
              aria-label={`${planoAtivo.conteudo.nutricao.proteinaG} gramas de proteína, ${planoAtivo.conteudo.nutricao.carboidratosG} gramas de carboidratos e ${planoAtivo.conteudo.nutricao.gordurasG} gramas de gorduras`}
            >
              <span
                className="h-full bg-[#f18562]"
                style={{
                  flex: planoAtivo.conteudo.nutricao.proteinaG * 4,
                }}
              />
              <span
                className="h-full bg-[#78b990]"
                style={{
                  flex: planoAtivo.conteudo.nutricao.carboidratosG * 4,
                }}
              />
              <span
                className="h-full bg-[#f3cf6b]"
                style={{
                  flex: planoAtivo.conteudo.nutricao.gordurasG * 9,
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-body-sm">
              <div>
                <span className="mb-1 block size-2 rounded-full bg-[#f18562]" />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.proteinaG} g
                </strong>
                <span className="block text-muted-foreground">Proteína</span>
              </div>
              <div>
                <span className="mb-1 block size-2 rounded-full bg-[#78b990]" />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.carboidratosG} g
                </strong>
                <span className="block text-muted-foreground">Carboidratos</span>
              </div>
              <div>
                <span className="mb-1 block size-2 rounded-full bg-[#f3cf6b]" />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.gordurasG} g
                </strong>
                <span className="block text-muted-foreground">Gorduras</span>
              </div>
            </div>
          </div>
        </section>
        </>
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
