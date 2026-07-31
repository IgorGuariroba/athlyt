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
import { obterRascunho } from "@/domain/plano/repositorio";

const CORES_MACROS = {
  proteina: "bg-[#f18562]",
  carboidratos: "bg-[#78b990]",
  gorduras: "bg-[#f3cf6b]",
} as const;

function LinhaMacro({
  rotulo,
  gramas,
  calorias,
  total,
  cor,
}: {
  rotulo: string;
  gramas: number;
  calorias: number;
  total: number;
  cor: string;
}) {
  const percentual = Math.max(4, Math.round((calorias / total) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-body-md font-semibold text-on-surface">
          {rotulo}
        </span>
        <span className="text-body-md tabular-nums text-muted-foreground">
          {gramas} g
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full ${cor}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export default async function RevisaoPlanoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const plano = await obterRascunho(session.user.id);
  if (!plano) redirect("/plano/gerando");

  const { bloco, nutricao } = plano.conteudo;
  const caloriasProteina = nutricao.proteinaG * 4;
  const caloriasCarboidratos = nutricao.carboidratosG * 4;
  const caloriasGorduras = nutricao.gordurasG * 9;

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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-background pb-28">
      <header className="flex flex-col gap-3 px-6 pt-8 pb-7">
        <div className="flex items-center justify-between">
          <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
            Seu programa
          </p>
          {plano.conteudo.modoConservador ? (
            <Badge variant="secondary">Modo Conservador</Badge>
          ) : (
            <Badge className="gap-1">
              <Check className="size-3.5" aria-hidden="true" />
              Perfil completo
            </Badge>
          )}
        </div>
        <h1 className="max-w-sm text-[2rem] leading-tight font-bold text-on-surface-strong">
          Seu Plano Ativo está pronto
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          Confira como treino e nutrição foram organizados antes de ativar seu
          programa.
        </p>
      </header>

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
              className="text-[2rem] leading-tight font-bold tabular-nums text-on-surface-strong"
            >
              {nutricao.calorias} kcal
            </h2>
          </div>
          <Flame className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-5">
          <LinhaMacro
            rotulo="Proteína"
            gramas={nutricao.proteinaG}
            calorias={caloriasProteina}
            total={nutricao.calorias}
            cor={CORES_MACROS.proteina}
          />
          <LinhaMacro
            rotulo="Carboidratos"
            gramas={nutricao.carboidratosG}
            calorias={caloriasCarboidratos}
            total={nutricao.calorias}
            cor={CORES_MACROS.carboidratos}
          />
          <LinhaMacro
            rotulo="Gorduras"
            gramas={nutricao.gordurasG}
            calorias={caloriasGorduras}
            total={nutricao.calorias}
            cor={CORES_MACROS.gorduras}
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
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button asChild size="lg" className="mx-auto h-14 w-full max-w-md text-base font-bold">
          <Link href="/plano/revisao/treino">
            Revisar treinos
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
