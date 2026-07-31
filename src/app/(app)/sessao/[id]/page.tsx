import { notFound } from "next/navigation";
import { ChevronLeft, CircleDot, Dumbbell, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { obterSessao } from "@/domain/sessao/repositorio";
import { abandonarSessaoAction, concluirSessaoAction } from "../actions";
import { RegistroSerie } from "./registro-serie";

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const sessao = session?.user?.id ? await obterSessao(session.user.id, id) : null;
  if (!sessao) notFound();
  const concluidas = sessao.exercicios.flatMap((e) => e.series).filter((s) => s.concluida).length;
  const total = sessao.exercicios.reduce((soma, e) => soma + e.series.length, 0);

  return (
    <div className="flex flex-col gap-5 p-4 pb-28">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon"><Link href="/inicio" aria-label="Voltar ao Início"><ChevronLeft /></Link></Button>
        <div className="text-center"><p className="text-label-md text-muted-foreground">SESSÃO EM ANDAMENTO</p><h1 className="text-title font-bold">{sessao.nome}</h1></div>
        <Button variant="ghost" size="icon" aria-label="Opções da sessão"><MoreHorizontal /></Button>
      </header>

      <section className="flex items-center justify-between rounded-xl bg-surface-container p-4">
        <div><strong className="text-headline-md tabular-nums">{concluidas}/{total}</strong><p className="text-body-sm text-muted-foreground">séries registradas</p></div>
        <Badge variant="secondary" className="gap-1"><CircleDot className="size-3 text-success" /> Online</Badge>
      </section>

      {sessao.exercicios.map((exercicio, indice) => {
        const feito = exercicio.series.every((serie) => serie.concluida);
        return <section key={exercicio.exercicioId} className="overflow-hidden rounded-2xl border border-border bg-surface-container">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className={`flex size-11 items-center justify-center rounded-xl ${feito ? "bg-success/15 text-success" : "bg-surface-container-high"}`}><Dumbbell className="size-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">Exercício {indice + 1}</p><h2 className="truncate text-title font-bold">{exercicio.nome}</h2><p className="text-body-sm text-muted-foreground">{exercicio.series.length} séries · {exercicio.series[0].repeticoesSugeridas} reps · RIR {exercicio.series[0].rir}</p></div>
          </div>
          <div className="px-3">
            {exercicio.series.map((serie) => <RegistroSerie key={serie.numero} sessionId={sessao.id} exercicioId={exercicio.exercicioId} numero={serie.numero} repeticoesSugeridas={serie.repeticoesSugeridas} rirSugerido={serie.rir} descansoSeg={exercicio.descansoSeg} concluida={serie.concluida} cargaInicial={serie.cargaKg} repeticoesIniciais={serie.repeticoes} />)}
          </div>
        </section>;
      })}

      <form action={concluirSessaoAction.bind(null, sessao.id)}><Button size="lg" className="h-14 w-full text-base font-bold">Concluir treino</Button></form>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-center text-label-lg text-muted-foreground">Abandonar sessão</summary>
        <form action={abandonarSessaoAction.bind(null, sessao.id)} className="mt-4 flex flex-col gap-3">
          <label className="text-body-sm text-muted-foreground" htmlFor="motivo">Por que você precisa parar?</label>
          <select id="motivo" name="motivo" className="h-12 rounded-lg border border-input bg-surface-container-high px-3" required><option value="tempo">Falta de tempo</option><option value="equipamento">Equipamento indisponível</option><option value="dor">Dor ou desconforto</option><option value="outro">Outro motivo</option></select>
          <Button variant="destructive" size="lg">Confirmar abandono</Button>
        </form>
      </details>
    </div>
  );
}
