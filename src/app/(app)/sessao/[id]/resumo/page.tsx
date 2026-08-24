import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Clock3, Dumbbell, Layers3 } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  BarraAcaoFixa,
  CabecalhoSecao,
  CompartilharResultado,
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  Metrica,
  NotaLinha,
  PainelMetricas,
  SecoesTela,
  SeloConclusao,
  TelaConteudo,
  ValorComSelo,
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
  // Ignora pausas longas entre eventos: uma sessão pode ficar aberta
  // enquanto o atleta se ausenta, mas isso não é duração de treino.
  const tempos = [resumo.startedAt, ...resumo.eventos.map((evento) => evento.createdAt)]
    .sort((a, b) => a.getTime() - b.getTime());
  const minutosAtivos = tempos.slice(1).reduce((total, atual, indice) => {
    const intervalo = (atual.getTime() - tempos[indice].getTime()) / 60000;
    return total + (intervalo <= 10 ? intervalo : 0);
  }, 0);
  const duracaoMin = Math.max(1, Math.round(minutosAtivos));
  const concluida = resumo.estado === "concluida";

  return (
    <TelaConteudo comAcaoFixa>
      <SeloConclusao
        Icone={Award}
        tom={concluida ? "sucesso" : "atencao"}
        contexto={concluida ? "Treino concluído" : "Sessão encerrada"}
        titulo={resumo.nome}
        descricao={
          resumo.motivoAbandono ? `Motivo: ${resumo.motivoAbandono}` : undefined
        }
      />

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

        {concluida ? (
          <CompartilharResultado
            nome={resumo.nome}
            duracaoMin={duracaoMin}
            totalSeries={resumo.totalSeries}
            volumeKg={resumo.volumeKg}
            recordes={resumo.recordes.map(({ nome, valor }) => ({ nome, valor }))}
            exercicios={resumo.exercicios.map(({ nome }) => ({ nome }))}
          />
        ) : null}

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
                      <ValorComSelo selo="Recorde">
                        {recorde.valor} kg
                      </ValorComSelo>
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
                      .map((serie) => {
                        const modalidade = exercicio.protocolo ?? "repeticoes";
                        if (modalidade === "tempo") return `${serie.repeticoes} s`;
                        if (modalidade === "distancia") return `${serie.repeticoes} m`;
                        if (modalidade === "duracao") return `${serie.repeticoes} min`;
                        if (modalidade === "calorias") return `${serie.repeticoes} kcal`;
                        return `${serie.repeticoes}×${serie.cargaKg} kg · RIR ${serie.rir}`;
                      })
                      .join(" · ") || "Sem séries registradas"
                  }
                >
                  {exercicio.interrompido ? (
                    <NotaLinha>
                      Interrompido após {exercicio.series.length} de{" "}
                      {exercicio.seriesPlanejadas ?? exercicio.series.length}{" "}
                      séries · substituído por {exercicio.motivoSubstituicao}
                    </NotaLinha>
                  ) : exercicio.substituiuNome ? (
                    <NotaLinha>
                      Entrou no lugar de {exercicio.substituiuNome} · motivo:{" "}
                      {exercicio.motivoSubstituicao}
                    </NotaLinha>
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
