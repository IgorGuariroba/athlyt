import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DimensoesScorecard } from "@/domain/medicoes/revisao-corporal";
import { obterRevisaoAtual } from "../dados";

const ROTULOS: Array<[keyof DimensoesScorecard, string]> = [["aderencia", "Aderência"], ["desempenho", "Desempenho"], ["tendenciaCorporal", "Tendência corporal"], ["recuperacao", "Recuperação"], ["utilidade", "Utilidade"]];
export default async function ScorecardPage() {
  const revisao = await obterRevisaoAtual(); if (!revisao) redirect("/progresso/revisao");
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Revisão Semanal · 2/4</p><h1 className="text-headline-md font-bold">Scorecard de Progresso</h1><p className="text-body-sm text-muted-foreground">As dimensões permanecem separadas; o geral não apaga incertezas.</p></div><Card className="grid gap-3 p-4">{ROTULOS.map(([id, rotulo]) => <div key={id}><div className="flex justify-between text-body-sm"><b>{rotulo}</b><span>{revisao.scorecard[id]}/100</span></div><progress className="w-full" max="100" value={revisao.scorecard[id]}/></div>)}<strong>Geral: {revisao.scorecard.geral}/100</strong><small>Metodologia {revisao.scorecard.metodologiaVersao}</small></Card><Card className="grid grid-cols-2 gap-2 p-4">{Object.entries(revisao.confiancas).map(([nome, estado]) => <p key={nome} className="text-body-sm"><b className="capitalize">{nome.replace(/([A-Z])/g, " $1")}</b><br/>{estado}</p>)}</Card><Button asChild><Link href="/progresso/revisao/evidencias">Ver evidências</Link></Button></div>;
}
