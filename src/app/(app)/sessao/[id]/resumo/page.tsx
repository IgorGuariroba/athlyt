import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Clock3, Dumbbell, Layers3 } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { obterResumoSessao, obterSessao } from "@/domain/sessao/repositorio";

export default async function ResumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const encontrada = session?.user?.id ? await obterSessao(session.user.id, id) : null;
  if (!encontrada || encontrada.estado === "em_andamento") notFound();
  const resumo = await obterResumoSessao(session!.user!.id!, encontrada);
  const duracaoMin = Math.max(1, Math.round(((resumo.endedAt?.getTime() ?? resumo.startedAt.getTime()) - resumo.startedAt.getTime()) / 60000));

  return <div className="flex min-h-full flex-col gap-7 p-5 pb-28">
    <header className="pt-6 text-center">
      <div className={`mx-auto mb-5 flex size-20 items-center justify-center rounded-full ${resumo.estado === "concluida" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}><Award className="size-10" /></div>
      <p className="text-label-md font-semibold tracking-widest text-muted-foreground uppercase">{resumo.estado === "concluida" ? "Treino concluído" : "Sessão encerrada"}</p>
      <h1 className="mt-2 text-headline-lg font-bold">{resumo.nome}</h1>
      {resumo.motivoAbandono ? <p className="mt-2 text-body-md text-muted-foreground">Motivo: {resumo.motivoAbandono}</p> : null}
    </header>

    <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-border">
      <div className="bg-surface-container p-4 text-center"><Clock3 className="mx-auto mb-2 size-5 text-muted-foreground"/><strong className="block text-headline-md tabular-nums">{duracaoMin}m</strong><span className="text-caption text-muted-foreground">Duração</span></div>
      <div className="bg-surface-container p-4 text-center"><Layers3 className="mx-auto mb-2 size-5 text-muted-foreground"/><strong className="block text-headline-md tabular-nums">{resumo.totalSeries}</strong><span className="text-caption text-muted-foreground">Séries</span></div>
      <div className="bg-surface-container p-4 text-center"><Dumbbell className="mx-auto mb-2 size-5 text-muted-foreground"/><strong className="block text-headline-md tabular-nums">{resumo.volumeKg}</strong><span className="text-caption text-muted-foreground">Volume kg</span></div>
    </section>

    {resumo.recordes.length ? <section><h2 className="mb-3 text-title font-bold">Recordes da sessão</h2><div className="flex flex-col gap-2">{resumo.recordes.map((recorde) => <div key={recorde.exercicioId} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 p-4"><div><p className="text-label-md font-semibold text-warning">MAIOR CARGA</p><p className="text-body-md font-bold">{recorde.nome}</p></div><strong className="text-headline-md tabular-nums">{recorde.valor} kg</strong></div>)}</div></section> : null}

    <section><h2 className="mb-3 text-title font-bold">Exercícios</h2>{resumo.exercicios.map((exercicio) => <div key={exercicio.exercicioId} className="mb-2 rounded-xl bg-surface-container p-4"><strong>{exercicio.nome}</strong><p className="text-body-sm text-muted-foreground">{exercicio.series.filter((s) => s.concluida).map((s) => `${s.repeticoes} reps × ${s.cargaKg} kg`).join(" · ") || "Sem séries registradas"}</p></div>)}</section>

    <Button asChild size="lg" className="h-14 w-full text-base font-bold"><Link href="/sessao/historico">Ver histórico de sessões</Link></Button>
    <Button asChild variant="ghost"><Link href="/inicio">Concluído</Link></Button>
  </div>;
}
