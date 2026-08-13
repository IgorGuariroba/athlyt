import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Dumbbell, Repeat2 } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  BarraAcaoFixa,
  CabecalhoCartaoLista,
  CabecalhoTela,
  CampoSelecao,
  CartaoLista,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  Revelar,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { obterRascunho } from "@/domain/plano/repositorio";
import {
  exerciciosElegiveis,
  regioesLesionadas,
} from "@/domain/plano/exercicios";
import { substituirExercicioAction } from "../../actions";

/**
 * Descanso legível sem fração de minuto: abaixo de dois minutos a
 * unidade natural é o segundo ("75 s"), acima disso o minuto redondo
 * (DESIGN.md > Content & Voice: unidade junto do valor).
 */
function descanso(descansoSeg: number): string {
  if (descansoSeg < 120) return `${descansoSeg} s`;
  const min = Math.round(descansoSeg / 60);
  const resto = descansoSeg - min * 60;
  return resto === 0 ? `${min} min` : `${min} min ${Math.abs(resto)} s`;
}

export default async function RevisaoTreinoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [plano, perfil] = await Promise.all([
    obterRascunho(session.user.id),
    obterPerfilVigente(session.user.id),
  ]);
  if (!plano || !perfil) redirect("/plano/gerando");

  const elegiveis = exerciciosElegiveis({
    equipamentos: perfil.respostas.equipamentos ?? [],
    regioesLesionadas: regioesLesionadas(perfil.respostas.lesoes),
    modoConservador: plano.conteudo.modoConservador,
  });
  const dias = plano.conteudo.bloco.dias;

  return (
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto="Revisão do plano"
        titulo="Treino dia a dia"
        descricao={`${dias.length} sessões por semana. Veja por que cada exercício foi escolhido e troque o que não fizer sentido para você.`}
      />

      <SecoesTela>
        {dias.map((dia, indiceDia) => {
          const totalSeries = dia.exercicios.reduce(
            (soma, exercicio) => soma + exercicio.series,
            0,
          );
          return (
            <CartaoLista key={dia.id} aria-labelledby={`dia-${dia.id}`}>
              <CabecalhoCartaoLista
                id={`dia-${dia.id}`}
                indicador={indiceDia + 1}
                titulo={dia.nome}
                Icone={Dumbbell}
                meta={
                  <>
                    <span className="capitalize">{dia.diaSemana}</span> ·{" "}
                    <span className="tabular-nums">
                      {dia.exercicios.length} exercícios · {totalSeries} séries
                    </span>
                  </>
                }
              />

              <LinhasCartaoLista>
                {dia.exercicios.map((exercicio) => {
                  const alternativas = elegiveis.filter(
                    (candidato) =>
                      candidato.padrao === exercicio.padrao &&
                      candidato.id !== exercicio.exercicioId,
                  );
                  return (
                    <LinhaCartaoLista
                      key={exercicio.exercicioId}
                      titulo={exercicio.nome}
                    >
                      <FaixaDados>
                        {exercicio.series} séries · {exercicio.repeticoes} reps ·
                        RIR {exercicio.rir} · {descanso(exercicio.descansoSeg)} de
                        descanso
                      </FaixaDados>

                      <Revelar rotulo="Por que este exercício?">
                        {exercicio.justificativa}
                      </Revelar>

                      {alternativas.length ? (
                        <Revelar rotulo="Trocar exercício" Icone={Repeat2}>
                          <form
                            action={substituirExercicioAction}
                            className="flex flex-col gap-2"
                          >
                            <input
                              type="hidden"
                              name="planoId"
                              value={plano.id}
                            />
                            <input type="hidden" name="diaId" value={dia.id} />
                            <input
                              type="hidden"
                              name="exercicioId"
                              value={exercicio.exercicioId}
                            />
                            <CampoSelecao
                              compacto
                              id={`substituto-${exercicio.exercicioId}`}
                              name="novoExercicioId"
                              rotulo={`Substituto para ${exercicio.nome}`}
                              opcoes={alternativas.map((candidato) => ({
                                valor: candidato.id,
                                rotulo: candidato.nome,
                              }))}
                            />
                            <Button
                              type="submit"
                              variant="secondary"
                              className="h-11 w-full text-label-lg"
                            >
                              Substituir
                            </Button>
                          </form>
                        </Revelar>
                      ) : null}
                    </LinhaCartaoLista>
                  );
                })}
              </LinhasCartaoLista>
            </CartaoLista>
          );
        })}
      </SecoesTela>

      <NotaTela>
        Cada troca fica registrada na Trilha de Decisão e mantém o mesmo padrão
        de movimento, para não descaracterizar o bloco.
      </NotaTela>

      <BarraAcaoFixa>
        <Button asChild size="lg" className="h-14 w-full text-base font-bold">
          <Link href="/plano/revisao/nutricao">
            Revisar nutrição
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
