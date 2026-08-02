import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gerarRevisaoSemanal } from "./actions";
import { obterRevisaoAtual } from "./dados";

export default async function RevisaoSemanalPage() {
  const revisao = await obterRevisaoAtual();
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Revisão Semanal</p><h1 className="text-headline-md font-bold">Planejado versus realizado</h1><p className="text-body-sm text-muted-foreground">Medição isolada ou troca de método não conta como resposta corporal.</p></div>
    {revisao ? <Card className="grid gap-2 p-4"><strong>{revisao.periodoInicio.toLocaleDateString("pt-BR")}–{revisao.periodoFim.toLocaleDateString("pt-BR")}</strong>{revisao.evidencias.slice(0, 3).map((item) => <p key={item.descricao} className="text-body-sm"><span className={item.sentido === "favor" ? "text-success" : "text-warning"}>{item.sentido === "favor" ? "A favor" : "Contra"}:</span> {item.descricao}</p>)}<Button asChild><Link href="/progresso/revisao/scorecard">Ver Scorecard</Link></Button></Card> : <Card className="p-4 text-body-sm text-muted-foreground">A primeira revisão consolida os últimos sete dias sem inventar dados ausentes.</Card>}
    <form action={gerarRevisaoSemanal}><Button className="w-full">{revisao ? "Atualizar revisão" : "Iniciar revisão"}</Button></form><Button asChild variant="ghost"><Link href="/progresso">Voltar ao Progresso</Link></Button></div>;
}
