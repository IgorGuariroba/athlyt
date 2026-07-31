import Link from "next/link";
import { ChevronLeft, CheckCircle2, CircleSlash2 } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { listarHistoricoSessoes, resumirSessao } from "@/domain/sessao/repositorio";

export default async function HistoricoPage() {
  const session = await auth();
  const historico = session?.user?.id ? await listarHistoricoSessoes(session.user.id) : [];
  return <div className="flex flex-col gap-5 p-4 pb-28">
    <header className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/inicio" aria-label="Voltar"><ChevronLeft /></Link></Button><div><p className="text-label-md text-muted-foreground">SESSÃO DE TREINO</p><h1 className="text-headline-md font-bold">Histórico</h1></div></header>
    {historico.length === 0 ? <p className="rounded-xl bg-surface-container p-5 text-body-md text-muted-foreground">Suas sessões concluídas ou abandonadas aparecerão aqui.</p> : historico.map((item) => {
      const resumo = resumirSessao(item);
      return <Link key={item.id} href={item.estado === "em_andamento" ? `/sessao/${item.id}` : `/sessao/${item.id}/resumo`} className="flex items-center gap-4 rounded-2xl border border-border bg-surface-container p-4">
        {item.estado === "concluida" ? <CheckCircle2 className="size-7 text-success" /> : item.estado === "abandonada" ? <CircleSlash2 className="size-7 text-warning" /> : <span className="size-3 rounded-full bg-info" />}
        <div className="flex-1"><strong className="text-title">{item.nome}</strong><p className="text-body-sm text-muted-foreground">{item.startedAt.toLocaleDateString("pt-BR")} · {resumo.totalSeries} séries · {resumo.volumeKg} kg</p></div><span className="text-label-md text-muted-foreground">{item.estado === "em_andamento" ? "Continuar" : item.estado === "concluida" ? "Concluída" : "Abandonada"}</span>
      </Link>;
    })}
  </div>;
}
