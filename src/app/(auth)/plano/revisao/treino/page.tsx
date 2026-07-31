import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { obterRascunho } from "@/domain/plano/repositorio";
import { exerciciosElegiveis, regioesLesionadas } from "@/domain/plano/exercicios";
import { substituirExercicioAction } from "../../actions";

export default async function RevisaoTreinoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [plano, perfil] = await Promise.all([obterRascunho(session.user.id), obterPerfilVigente(session.user.id)]);
  if (!plano || !perfil) redirect("/plano/gerando");
  const elegiveis = exerciciosElegiveis({ equipamentos: perfil.respostas.equipamentos ?? [], regioesLesionadas: regioesLesionadas(perfil.respostas.lesoes), modoConservador: plano.conteudo.modoConservador });
  return <main className="flex flex-1 flex-col gap-6 px-6 py-8">
    <div><p className="text-body-sm text-muted-foreground">Revisão do plano</p><h1 className="text-headline-md font-bold">Treino dia a dia</h1></div>
    {plano.conteudo.bloco.dias.map((dia) => <section key={dia.id} className="flex flex-col gap-3">
      <div><h2 className="text-title-lg font-bold">{dia.nome}</h2><p className="capitalize text-body-sm text-muted-foreground">{dia.diaSemana}</p></div>
      {dia.exercicios.map((exercicio) => {
        const alternativas = elegiveis.filter((e) => e.padrao === exercicio.padrao && e.id !== exercicio.exercicioId);
        return <Card key={exercicio.exercicioId} className="flex flex-col gap-3 p-4">
          <strong>{exercicio.nome}</strong>
          <p className="tabular-nums">{exercicio.series} séries × {exercicio.repeticoes} reps · RIR {exercicio.rir} · {Math.round(exercicio.descansoSeg / 60 * 10) / 10} min</p>
          <details><summary className="cursor-pointer font-semibold">Por que este exercício?</summary><p className="mt-2 text-body-sm text-muted-foreground">{exercicio.justificativa}</p></details>
          {alternativas.length ? <form action={substituirExercicioAction} className="flex gap-2">
            <input type="hidden" name="planoId" value={plano.id}/><input type="hidden" name="diaId" value={dia.id}/><input type="hidden" name="exercicioId" value={exercicio.exercicioId}/>
            <select name="novoExercicioId" aria-label={`Substituto para ${exercicio.nome}`} className="min-w-0 flex-1 rounded-lg border bg-background px-3">
              {alternativas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select><Button type="submit" variant="outline">Substituir</Button>
          </form> : null}
        </Card>;
      })}
    </section>)}
    <Button asChild size="lg" className="h-12"><Link href="/plano/revisao/nutricao">Revisar nutrição</Link></Button>
  </main>;
}
