import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { decidirPropostaRevisao, desfazerRevisao } from "../actions";
import { obterRevisaoAtual } from "../dados";

const ROTULO = { manter: "Manter Plano Ativo", auto_aplicado: "Ajuste Auto-aplicado", estrutural: "Proposta estrutural" };
export default async function PropostaPage() {
  const revisao = await obterRevisaoAtual(); if (!revisao) redirect("/progresso/revisao");
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Revisão Semanal · 4/4</p><h1 className="text-headline-md font-bold">{ROTULO[revisao.proposta.tipo]}</h1></div><Card className="grid gap-3 p-4"><p>{revisao.proposta.justificativa}</p>{revisao.proposta.ajuste ? <p className="text-body-sm"><b>Limite:</b> {revisao.proposta.ajuste.limitePercentual}% · regra {revisao.proposta.ajuste.regraVersao}</p> : null}<p className="text-body-sm text-muted-foreground">Estado: {revisao.estado}. Mudanças estruturais nunca são ativadas sem revisão e aprovação explícita.</p>{revisao.proposta.exigeAprovacao && revisao.estado === "pendente" ? <div className="grid grid-cols-2 gap-2"><form action={decidirPropostaRevisao}><input type="hidden" name="reviewId" value={revisao.id}/><input type="hidden" name="decisao" value="aprovar"/><Button className="w-full">Criar rascunho</Button></form><form action={decidirPropostaRevisao}><input type="hidden" name="reviewId" value={revisao.id}/><input type="hidden" name="decisao" value="rejeitar"/><Button className="w-full" variant="outline">Rejeitar</Button></form></div> : null}{revisao.estado === "aplicada" && revisao.baselinePlanId ? <form action={desfazerRevisao}><input type="hidden" name="reviewId" value={revisao.id}/><Button variant="outline">Desfazer proposta</Button></form> : null}</Card><Button asChild><Link href="/progresso">Concluir revisão</Link></Button></div>;
}
