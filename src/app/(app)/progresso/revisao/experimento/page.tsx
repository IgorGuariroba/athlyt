import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { obterExperimentoAtivo, obterRascunho } from "@/domain/plano/repositorio";
import { executarRollback, iniciarExperimento } from "../actions";

export default async function ExperimentoPage({ searchParams }: { searchParams: Promise<{ sucesso?: string }> }) {
  const session = await auth(); if (!session?.user?.id) redirect("/"); const aviso = await searchParams;
  const [experimento, rascunho] = await Promise.all([obterExperimentoAtivo(session.user.id), obterRascunho(session.user.id)]);
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Experimento de Plano</p><h1 className="text-headline-md font-bold">Uma hipótese, poucas variáveis</h1><p className="text-body-sm text-muted-foreground">O Plano Estável permanece preservado para rollback.</p></div>{aviso.sucesso ? <p role="status" className="text-success">{aviso.sucesso}</p> : null}
    {experimento ? <Card className="grid gap-3 p-4"><strong>Experimento ativo</strong><p>{experimento.hipotese}</p><p className="text-body-sm">Variáveis: {experimento.variaveis.join(", ")} · janela mínima {experimento.janelaMinimaSemanas} semanas</p><p className="text-body-sm"><b>Sucesso:</b> {experimento.criterioSucesso}<br/><b>Interrupção:</b> {experimento.criterioInterrupcao}</p><form action={executarRollback}><input type="hidden" name="experimentId" value={experimento.id}/><Button variant="destructive">Interromper e restaurar Plano Estável</Button></form></Card> : rascunho ? <form action={iniciarExperimento} className="grid gap-4"><input type="hidden" name="planoId" value={rascunho.id}/><Card className="grid gap-3 p-4"><strong>Rascunho candidato</strong><label className="text-body-sm">Hipótese<Input required name="hipotese" placeholder="Se ajustarmos..., esperamos..."/></label><fieldset className="grid gap-2 text-body-sm"><legend>Variáveis alteradas</legend>{["volume de treino", "seleção de exercícios", "energia e macros", "cadência"].map((item) => <label key={item}><input type="checkbox" name="variaveis" value={item}/> {item}</label>)}</fieldset><label className="text-body-sm">Critério de sucesso<Input required name="criterioSucesso"/></label><label className="text-body-sm">Critério de interrupção<Input required name="criterioInterrupcao"/></label><label className="text-body-sm">Janela mínima (semanas)<Input required type="number" min="1" max="8" name="janelaMinimaSemanas" defaultValue="2"/></label><Button>Ativar Experimento de Plano</Button></Card></form> : <Card className="p-4 text-body-sm text-muted-foreground">Nenhum experimento ativo ou rascunho aprovado.</Card>}
    <Button asChild variant="ghost"><Link href="/progresso/revisao/proposta">Voltar à proposta</Link></Button></div>;
}
