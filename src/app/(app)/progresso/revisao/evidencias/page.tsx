import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obterRevisaoAtual } from "../dados";

export default async function EvidenciasPage() {
  const revisao = await obterRevisaoAtual(); if (!revisao) redirect("/progresso/revisao");
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Revisão Semanal · 3/4</p><h1 className="text-headline-md font-bold">Evidências e incertezas</h1><p className="text-body-sm text-muted-foreground">Divergências continuam visíveis em vez de serem fundidas.</p></div><div className="grid gap-3">{revisao.evidencias.map((item) => <Card key={item.descricao} className="grid gap-1 p-4"><div className="flex justify-between"><strong className={item.sentido === "favor" ? "text-success" : "text-warning"}>{item.sentido === "favor" ? "Sustenta" : "Enfraquece"}</strong><span className="text-body-sm">qualidade {item.qualidade}</span></div><p className="text-body-sm">{item.descricao}</p><small>{item.fonte}{item.metodo ? ` · ${item.metodo}` : ""}{item.protocolo ? ` · ${item.protocolo}` : ""}{item.observadoEm ? ` · ${new Date(item.observadoEm).toLocaleDateString("pt-BR")}` : ""}</small></Card>)}</div><Button asChild><Link href="/progresso/revisao/proposta">Ver proposta</Link></Button><Button asChild variant="ghost"><Link href="/mais/trilhas">Abrir Trilha de Decisão</Link></Button></div>;
}
