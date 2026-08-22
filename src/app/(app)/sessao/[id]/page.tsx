import { notFound } from "next/navigation";
import { ChevronLeft, Dumbbell, MoreHorizontal, Repeat2 } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CampoSelecao, ExplicacaoAgent, FichaExercicio, Revelar } from "@/components/tela";
import { encontrarExercicio, rotuloGrupoMuscular } from "@/domain/plano/exercicios";
import { midiaDoExercicio } from "@/domain/plano/midia-execucao";
import { obterSessao } from "@/domain/sessao/repositorio";
import { abandonarSessaoAction, concluirSessaoAction } from "../actions";
import { BadgeConexao, ProvedorConexao } from "./estado-conexao";
import { AjusteDescanso } from "./ajuste-descanso";
import { PainelCoach } from "./painel-coach";
import { RegistroSerie } from "./registro-serie";
import { ConclusaoSessao } from "./conclusao-sessao";
import { NavegadorExercicios } from "./navegador-exercicios";

const MOTIVOS_ABANDONO = [
  { valor: "tempo", rotulo: "Falta de tempo" },
  { valor: "equipamento", rotulo: "Equipamento indisponível" },
  { valor: "dor", rotulo: "Dor ou desconforto" },
  { valor: "outro", rotulo: "Outro motivo" },
] as const;

export default async function SessaoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ exercicio?: string }> }) {
  const { id } = await params;
  const { exercicio: exercicioParam } = await searchParams;
  const session = await auth();
  const sessao = session?.user?.id ? await obterSessao(session.user.id, id) : null;
  if (!sessao) notFound();
  const concluidas = sessao.exercicios.flatMap((e) => e.series).filter((s) => s.concluida).length;
  const total = sessao.exercicios.reduce((soma, e) => soma + e.series.length, 0);
  const indiceAtual = Math.min(Math.max(Number(exercicioParam ?? 0), 0), sessao.exercicios.length - 1);

  return (
    <ProvedorConexao
      sessionId={sessao.id}
      seriesConfirmadas={sessao.exercicios.flatMap((item) => item.series.filter((s) => s.concluida).map((s) => ({ exercicioId: item.exercicioId, numero: s.numero })))}
    >
    <div className="flex min-w-0 flex-col gap-5 p-4 pb-28">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon"><Link href="/inicio" aria-label="Voltar ao Início"><ChevronLeft /></Link></Button>
        <div className="text-center"><p className="text-label-md text-muted-foreground">SESSÃO EM ANDAMENTO</p><h1 className="text-title font-bold">{sessao.nome}</h1></div>
        <Button variant="ghost" size="icon" aria-label="Opções da sessão"><MoreHorizontal /></Button>
      </header>

      <section className="flex items-center justify-between rounded-xl bg-surface-container p-4">
        <div><strong className="text-headline-md tabular-nums">{concluidas}/{total}</strong><p className="text-body-sm text-muted-foreground">séries registradas</p></div>
        <BadgeConexao />
      </section>

      <NavegadorExercicios
        sessaoId={sessao.id}
        indiceInicial={indiceAtual}
        concluido={sessao.exercicios.map((item) => item.interrompido || item.series.every((serie) => serie.concluida))}
      >
        {sessao.exercicios.map((exercicio, indice) => {
          const feito = exercicio.series.every((serie) => serie.concluida);
          const definicaoExercicio = encontrarExercicio(exercicio.exercicioId);
          const midia = midiaDoExercicio(exercicio.exercicioId);
          const proximoIndice = Math.min(indice + 1, sessao.exercicios.length - 1);

          return (
            <div key={`${exercicio.exercicioId}-${indice}`} className="flex min-w-0 flex-col gap-5">
              <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <div className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl ${feito ? "bg-success/15 text-success" : "bg-surface-container-high"}`}>
                    {midia ? (
                      // GIF nativo do plano Basic: pequeno aqui para preservar nitidez.
                      // eslint-disable-next-line @next/next/no-img-element -- mídia same-origin da rota protegida
                      <img src={`/api/midia-execucao/${exercicio.exercicioId}`} alt="" aria-hidden className="size-full object-contain" />
                    ) : <Dumbbell className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">Exercício {indice + 1} de {sessao.exercicios.length}</p>
                    <div className="flex min-w-0 items-center gap-1">
                      <h2 className="truncate text-title font-bold">{exercicio.nome}</h2>
                      {definicaoExercicio ? (
                        <FichaExercicio
                          nome={exercicio.nome}
                          grupo={definicaoExercicio.grupoPrimario}
                          grupoMuscular={rotuloGrupoMuscular(definicaoExercicio.grupoPrimario)}
                          comoExecutar={exercicio.comoExecutar ?? definicaoExercicio.comoExecutar}
                          midiaUrl={midia ? `/api/midia-execucao/${exercicio.exercicioId}` : undefined}
                        />
                      ) : null}
                    </div>
                    <p className="text-body-sm text-muted-foreground">{exercicio.series.length} séries · {exercicio.series[0].repeticoesSugeridas}{definicaoExercicio?.id === "prancha" ? " s" : " reps"} · RIR {exercicio.series[0].rir}</p>
                  </div>
                  {exercicio.interrompido ? null : (
                    <Button asChild variant="ghost" size="icon" className="shrink-0">
                      <Link href={`/sessao/${sessao.id}/substituir?exercicio=${exercicio.exercicioId}`} aria-label={`Substituir ${exercicio.nome}`}><Repeat2 /></Link>
                    </Button>
                  )}
                </div>
                {exercicio.interrompido ? (
                  <p className="border-b border-border bg-surface-container-high px-4 py-2 text-body-sm text-muted-foreground">
                    Interrompido após {exercicio.series.length} de {exercicio.seriesPlanejadas ?? exercicio.series.length} séries · motivo: {exercicio.motivoSubstituicao}. As séries que você fez continuam valendo.
                  </p>
                ) : exercicio.substituiuNome ? (
                  <p className="border-b border-border bg-surface-container-high px-4 py-2 text-body-sm text-muted-foreground">
                    Substitui <strong className="text-on-surface">{exercicio.substituiuNome}</strong> · motivo: {exercicio.motivoSubstituicao}
                  </p>
                ) : null}
                {/* Sob carga, entre séries, o atleta lê uma frase — não uma
                    tabela de origem. Daí a apresentação de ícone. */}
                {exercicio.explicacao ? (
                  <div className="border-b border-border px-4 py-3">
                    <ExplicacaoAgent
                      pergunta="Por que este exercício?"
                      explicacao={exercicio.explicacao}
                      apresentacao="icone"
                    />
                  </div>
                ) : null}
                <PainelCoach exercicio={exercicio} />
                <AjusteDescanso exercicioId={exercicio.exercicioId} descansoPrescritoSeg={exercicio.descansoSeg} />
                <details className="border-b border-border px-4 py-3 text-body-sm"><summary className="cursor-pointer font-semibold">O que é RIR?</summary><p className="mt-2 text-muted-foreground">É quantas repetições você ainda conseguiria fazer com boa técnica ao encerrar a série. Quanto menor o RIR, mais difícil foi a série.</p></details>
                <div className="px-3">
                  {exercicio.series.map((serie, serieIndice) => <RegistroSerie key={serie.numero} exercicioId={exercicio.exercicioId} numero={serie.numero} repeticoesSugeridas={serie.repeticoesSugeridas} rirSugerido={serie.rir} descansoSeg={exercicio.descansoSeg} concluida={serie.concluida} cargaInicial={serie.cargaKg} cargaSugerida={serie.cargaSugeridaKg ?? 0} melhorCargaAnterior={serie.melhorCargaAnteriorKg ?? 0} repeticoesIniciais={serie.repeticoes} temProximaSerie={serieIndice < exercicio.series.length - 1} modo={exercicio.protocolo ?? (definicaoExercicio?.id === "prancha" ? "tempo" : "repeticoes")} />)}
                </div>
              </section>

              {feito && indice < sessao.exercicios.length - 1 ? <Button asChild size="lg" className="h-14 w-full text-base font-bold"><Link href={`/sessao/${sessao.id}/exercicio/${sessao.exercicios[proximoIndice].exercicioId}`}>Próximo exercício</Link></Button> : null}
            </div>
          );
        })}
      </NavegadorExercicios>
      <ConclusaoSessao concluirAction={concluirSessaoAction.bind(null, sessao.id)} seriesPendentes={total - concluidas} />
      <div className="rounded-xl border border-border p-4">
        <Revelar rotulo="Abandonar sessão">
          <form action={abandonarSessaoAction.bind(null, sessao.id)} className="mt-1 flex flex-col gap-3">
            <CampoSelecao
              id="motivo"
              name="motivo"
              rotulo="Por que você precisa parar?"
              required
              opcoes={MOTIVOS_ABANDONO}
            />
            <Button variant="destructive" size="lg">Confirmar abandono</Button>
          </form>
        </Revelar>
      </div>
    </div>
    </ProvedorConexao>
  );
}
