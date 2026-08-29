import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
} from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AvisoAcao,
  BarraAcaoFixa,
  BarraMacro,
  CabecalhoTela,
  TelaConteudo,
} from "@/components/tela";
import { obterRascunho } from "@/domain/plano/repositorio";
import { regenerarPlanoInicialAction } from "../actions";
import { BotaoRegenerarPlano } from "./botao-regenerar-plano";

export default async function RevisaoPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const plano = await obterRascunho(session.user.id);
  if (!plano) redirect("/plano/gerando");

  const { erro } = await searchParams;
  const { bloco, nutricao } = plano.conteudo;

  const etapasCalculo = [
    {
      titulo: "Rotina e experiência",
      descricao: `${bloco.dias.length} dias disponíveis, com volume adequado ao seu nível.`,
    },
    {
      titulo: "Equipamentos e limitações",
      descricao:
        "Os exercícios foram filtrados pelo que você tem disponível e pelas limitações informadas.",
    },
    {
      titulo: "Objetivo e energia",
      descricao: nutricao.estrategia,
    },
  ];

  return (
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto="Seu programa"
        titulo="Seu Plano Ativo está pronto"
        descricao="Confira como treino e nutrição foram organizados antes de ativar seu programa."
        voltar={{ href: "/treino", rotulo: "Voltar ao Treino" }}
        acao={
          plano.conteudo.modoConservador ? (
            <Badge variant="secondary">Modo Conservador</Badge>
          ) : (
            <Badge className="gap-1">
              <Check className="size-3.5" aria-hidden="true" />
              Perfil completo
            </Badge>
          )
        }
      />

      <section
        aria-labelledby="resumo-treino"
        className="border-y border-border bg-surface-container px-6 py-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-on-surface-strong text-background">
            <Dumbbell className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-body-sm text-muted-foreground">
              Bloco de Treino
            </p>
            <h2
              id="resumo-treino"
              className="text-title-lg font-bold text-on-surface-strong"
            >
              {bloco.dias.length} treinos por semana
            </h2>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background p-4">
            <CalendarDays
              className="mb-3 size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <strong className="block text-headline-sm tabular-nums">
              {bloco.duracaoSemanas}
            </strong>
            <span className="text-body-sm text-muted-foreground">semanas</span>
          </div>
          <div className="rounded-xl bg-background p-4">
            <Dumbbell
              className="mb-3 size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <strong className="block text-headline-sm tabular-nums">
              {bloco.dias.length}
            </strong>
            <span className="text-body-sm text-muted-foreground">
              sessões semanais
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label-md font-semibold text-muted-foreground">
            Sua divisão
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {bloco.dias.map((dia, indice) => (
              <div key={dia.id} className="contents">
                <span className="rounded-full border border-border-strong px-3 py-2 text-body-sm font-semibold">
                  {dia.nome}
                </span>
                {indice < bloco.dias.length - 1 ? (
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="meta-nutricional" className="px-6 py-7">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-body-sm text-muted-foreground">Meta diária</p>
            <h2
              id="meta-nutricional"
              className="font-brand text-[2rem] leading-tight font-bold tracking-tight tabular-nums text-on-surface-strong"
            >
              {nutricao.calorias} kcal
            </h2>
          </div>
          <Flame className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-5">
          <BarraMacro
            macro="proteina"
            gramas={nutricao.proteinaG}
            caloriasTotais={nutricao.calorias}
          />
          <BarraMacro
            macro="carboidratos"
            gramas={nutricao.carboidratosG}
            caloriasTotais={nutricao.calorias}
          />
          <BarraMacro
            macro="gorduras"
            gramas={nutricao.gordurasG}
            caloriasTotais={nutricao.calorias}
          />
        </div>
      </section>

      <section
        aria-labelledby="como-criado"
        className="border-t border-border px-6 py-7"
      >
        <h2
          id="como-criado"
          className="mb-6 text-title-lg font-bold text-on-surface-strong"
        >
          Como seu plano foi criado?
        </h2>
        <ol className="flex flex-col">
          {etapasCalculo.map((etapa, indice) => (
            <li key={etapa.titulo} className="relative flex gap-4 pb-7 last:pb-0">
              {indice < etapasCalculo.length - 1 ? (
                <div className="absolute top-9 bottom-0 left-[17px] w-px bg-border-strong" />
              ) : null}
              <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-body-md font-bold text-background">
                {indice + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-body-md font-bold text-on-surface">
                  {etapa.titulo}
                </h3>
                <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                  {etapa.descricao}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-body-sm text-muted-foreground">
          Gerado pela regra auditável {plano.conteudo.regraVersao}. Você poderá
          revisar cada exercício antes da ativação.
        </p>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-body-md font-bold text-on-surface-strong">
            Este plano não ficou bom para você?
          </h3>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Peça uma nova sugestão ao agent usando os mesmos dados. O plano atual
            só será substituído se a nova geração for concluída.
          </p>
          <form action={regenerarPlanoInicialAction} className="mt-4 flex flex-col gap-3">
            {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}
            <BotaoRegenerarPlano />
          </form>
        </div>
      </section>

      <BarraAcaoFixa>
        <Button asChild size="lg" className="h-14 w-full text-base font-bold">
          <Link href="/plano/revisao/treino">
            Revisar treinos
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
