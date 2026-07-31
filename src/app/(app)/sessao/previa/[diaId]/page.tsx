import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Dumbbell, Play } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import { iniciarSessaoAction } from "../../actions";

export default async function PreviaSessaoPage({ params }: { params: Promise<{ diaId: string }> }) {
  const { diaId } = await params;
  const session = await auth();
  const plano = session?.user?.id ? await obterPlanoAtivo(session.user.id) : null;
  const dia = plano?.conteudo.bloco.dias.find((item) => item.id === diaId);
  if (!plano || !dia) notFound();
  const totalSeries = dia.exercicios.reduce((total, exercicio) => total + exercicio.series, 0);

  return <div className="flex min-h-full flex-col gap-6 p-4 pb-28">
    <header className="flex items-center justify-between">
      <Button asChild variant="ghost" size="icon"><Link href="/inicio" aria-label="Voltar"><ArrowLeft /></Link></Button>
      <p className="text-label-md font-semibold tracking-wider text-muted-foreground uppercase">Treino do dia</p>
      <span className="size-10" />
    </header>

    <section>
      <p className="mb-2 text-label-md text-muted-foreground">{plano.conteudo.bloco.divisao} · Bloco v{plano.versao}</p>
      <h1 className="text-headline-lg font-bold">{dia.nome}</h1>
      <p className="mt-2 text-body-lg text-muted-foreground">{dia.exercicios.length} exercícios · {totalSeries} séries</p>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
      {dia.exercicios.map((exercicio, indice) => <div key={exercicio.exercicioId} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-high"><Dumbbell className="size-6 text-muted-foreground" /></div>
        <div className="min-w-0 flex-1"><p className="text-caption font-semibold text-muted-foreground">{String(indice + 1).padStart(2, "0")}</p><h2 className="truncate text-title font-bold">{exercicio.nome}</h2><p className="text-body-sm text-muted-foreground">{exercicio.series} × {exercicio.repeticoes} reps · RIR {exercicio.rir}</p></div>
        <Check className="size-5 text-border-strong" />
      </div>)}
    </section>

    <div className="rounded-xl bg-surface-container p-4 text-body-sm text-muted-foreground">As cargas serão preenchidas pelo seu histórico. No primeiro treino, encontre uma carga confortável que respeite a meta de RIR.</div>

    <form action={iniciarSessaoAction} className="sticky bottom-20 mt-auto">
      <input type="hidden" name="diaId" value={dia.id} />
      <Button size="lg" className="h-16 w-full text-base font-bold"><Play className="size-5 fill-current" /> Iniciar treino</Button>
    </form>
  </div>;
}
