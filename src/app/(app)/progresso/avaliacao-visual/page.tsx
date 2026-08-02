import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { textoConsentimento } from "@/domain/ia/contexto/montagem";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";
import { executarAvaliacaoVisual, revogarConsentimentoVisual } from "./actions";

export default async function AvaliacaoVisualPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const aviso = await searchParams;
  const panorama = await obterPanoramaCorporal(session.user.id);
  const storage = criarStorageR2();
  const fotos = await Promise.all(panorama.fotos.slice(0, 12).map(async (foto) => ({ ...foto, url: await storage.urlLeitura(foto.objectKey) })));
  const ativa = panorama.avaliacoesVisuais.find((item) => item.ativa);
  const criterios = ativa ? Object.entries(ativa.criterios) : [];
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Avaliação visual</p><h1 className="text-headline-md font-bold">Critérios separados, sem nota corporal</h1><p className="text-body-sm text-muted-foreground">Fotos nunca produzem um percentual exato nem alteram o Plano Ativo isoladamente.</p></div>
    {aviso.erro ? <p role="alert" className="text-body-sm text-error">{aviso.erro}</p> : null}{aviso.sucesso ? <p role="status" className="text-body-sm text-success">{aviso.sucesso}</p> : null}
    {ativa ? <Card className="grid gap-3 p-4"><div className="flex justify-between"><strong>Projeção vigente</strong><span className="text-body-sm">confiança {ativa.confianca}</span></div><div className="grid grid-cols-2 gap-2">{criterios.map(([nome, nota]) => <div key={nome} className="rounded-md bg-muted p-2 text-body-sm capitalize"><b>{String(nome).replace("vTaper", "V-taper")}</b><br/>{Number(nota)}/100</div>)}</div><p><b>Gordura visual:</b> {(ativa.gorduraMinBasisPoints / 100).toLocaleString("pt-BR")}–{(ativa.gorduraMaxBasisPoints / 100).toLocaleString("pt-BR")}% (faixa probabilística)</p>{ativa.observacoes.map((texto) => <p key={texto} className="text-body-sm">• {texto}</p>)}{ativa.limitacoes.length ? <div className="text-body-sm text-muted-foreground"><b>Limitações:</b> {ativa.limitacoes.join("; ")}</div> : null}<small>Metodologia {ativa.metodologiaVersao} · modelo {ativa.modeloResolvido}</small><form action={revogarConsentimentoVisual}><Button variant="destructive">Revogar consentimento e projeção</Button></form></Card> : null}
    <form action={executarAvaliacaoVisual} className="grid gap-4"><Card className="grid gap-3 p-4"><strong>Selecione de 2 a 4 fotos</strong><div className="grid grid-cols-2 gap-3">{fotos.map((foto) => <label key={foto.id} className="grid gap-2 text-body-sm capitalize"><Image unoptimized src={foto.url} alt={`Foto corporal ${foto.pose.replaceAll("_", " ")}`} width={300} height={420} className="aspect-[2/3] w-full rounded-md object-cover"/><span><input type="checkbox" name="fotoId" value={foto.id}/> {foto.pose.replaceAll("_", " ")} · {foto.observadoEm.toLocaleDateString("pt-BR")}</span></label>)}</div>{!fotos.length ? <p className="text-body-sm text-muted-foreground">Envie fotos privadas antes de solicitar uma avaliação.</p> : null}</Card>
      <Card className="grid gap-3 p-4"><pre className="whitespace-pre-wrap font-sans text-body-sm">{textoConsentimento(obterRecorte("avaliacao-visual"), NOME_PROVEDOR)}</pre><label className="flex gap-2 text-body-sm"><input type="checkbox" name="consentimentoIA" value="sim"/> Autorizo este envio específico ao provedor de IA. Armazenar fotos no R2 não concede esta autorização.</label><Button disabled={fotos.length < 2}>Analisar fotos selecionadas</Button></Card>
    </form><Button asChild variant="ghost"><Link href="/progresso">Voltar ao Progresso</Link></Button></div>;
}
