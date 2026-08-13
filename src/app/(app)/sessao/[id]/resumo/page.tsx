import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Clock3, Dumbbell, Layers3 } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarraAcaoFixa,
  CabecalhoSecao,
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  Metrica,
  PainelMetricas,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterResumoSessao, obterSessao } from "@/domain/sessao/repositorio";

export default async function ResumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const encontrada = session?.user?.id
    ? await obterSessao(session.user.id, id)
    : null;
  if (!encontrada || encontrada.estado === "em_andamento") notFound();

  const resumo = await obterResumoSessao(session!.user!.id!, encontrada);
  const duracaoMin = Math.max(
    1,
    Math.round(
      ((resumo.endedAt?.getTime() ?? resumo.startedAt.getTime()) -
        resumo.startedAt.getTime()) /
        60000,
    ),
  );
  const concluida = resumo.estado === "concluida";

  return (
    <TelaConteudo comAcaoFixa>
      {/* O selo circular é a única marca celebratória do produto e
          existe só aqui: o fim de uma sessão é o momento em que
          DESIGN.md > Typography autoriza `display`/destaque
          ("resultados excepcionais"). */}
      <header className="flex flex-col items-center gap-2 px-6 pt-10 pb-6 text-center">
        <div
          className={`mb-3 flex size-20 items-center justify-center rounded-full ${
            concluida ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          }`}
        >
          <Award aria-hidden="true" className="size-10" />
        </div>
        <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
          {concluida ? "Treino concluído" : "Sessão encerrada"}
        </p>
        <h1 className="font-brand text-headline-lg font-bold text-on-surface-strong">
          {resumo.nome}
        </h1>
        {resumo.motivoAbandono ? (
          <p className="text-body-md text-muted-foreground">
            Motivo: {resumo.motivoAbandono}
          </p>
        ) : null}
      </header>

      <SecoesTela>
        <PainelMetricas>
          <Metrica
            Icone={Clock3}
            valor={duracaoMin}
            unidade="m"
            rotulo="Duração"
          />
          <Metrica Icone={Layers3} valor={resumo.totalSeries} rotulo="Séries" />
          <Metrica
            Icone={Dumbbell}
            valor={resumo.volumeKg}
            unidade=" kg"
            rotulo="Volume"
          />
        </PainelMetricas>

        {resumo.recordes.length ? (
          <section className="flex flex-col gap-3">
            <CabecalhoSecao titulo="Recordes da sessão" />
            <CartaoLista>
              <LinhasCartaoLista>
                {resumo.recordes.map((recorde) => (
                  <LinhaCartaoLista
                    key={recorde.exercicioId}
                    titulo={recorde.nome}
                    meta="Maior carga registrada"
                    valor={
                      <span className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning"
                        >
                          Recorde
                        </Badge>
                        {recorde.valor} kg
                      </span>
                    }
                  />
                ))}
              </LinhasCartaoLista>
            </CartaoLista>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <CabecalhoSecao titulo="Exercícios" />
          <CartaoLista>
            <LinhasCartaoLista>
              {resumo.exercicios.map((exercicio, indice) => (
                <LinhaCartaoLista
                  key={`${exercicio.exercicioId}-${indice}`}
                  titulo={exercicio.nome}
                  meta={
                    exercicio.series
                      .filter((serie) => serie.concluida)
                      .map(
                        (serie) => `${serie.repeticoes}×${serie.cargaKg} kg`,
                      )
                      .join(" · ") || "Sem séries registradas"
                  }
                >
                  {exercicio.interrompido ? (
                    <p className="text-caption text-muted-foreground">
                      Interrompido após {exercicio.series.length} de{" "}
                      {exercicio.seriesPlanejadas ?? exercicio.series.length}{" "}
                      séries · substituído por {exercicio.motivoSubstituicao}
                    </p>
                  ) : exercicio.substituiuNome ? (
                    <p className="text-caption text-muted-foreground">
                      Entrou no lugar de {exercicio.substituiuNome} · motivo:{" "}
                      {exercicio.motivoSubstituicao}
                    </p>
                  ) : null}
                </LinhaCartaoLista>
              ))}
            </LinhasCartaoLista>
          </CartaoLista>
        </section>

        <Button asChild variant="outline">
          <Link href="/sessao/historico">Ver histórico de sessões</Link>
        </Button>
      </SecoesTela>

      <BarraAcaoFixa>
        <Button asChild size="cta">
          <Link href="/inicio">Concluído</Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
