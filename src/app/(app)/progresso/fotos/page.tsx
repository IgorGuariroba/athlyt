import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";
import { ComparadorFotos } from "./comparador";

export default async function FotosProgressoPage() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const panorama = await obterPanoramaCorporal(session.user.id); const storage = criarStorageR2();
  const fotos = await Promise.all(panorama.fotos.map(async (foto) => ({ id: foto.id, pose: foto.pose, data: foto.observadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), condicoes: foto.condicoes, protocoloVersao: foto.protocoloVersao, url: await storage.urlLeitura(foto.objectKey, 600) })));
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Fotos privadas</p><h1 className="text-headline-md font-bold">Comparativo longitudinal</h1><p className="text-body-sm text-muted-foreground">Compare a mesma pose sem transformar diferenças de protocolo em mudança corporal.</p></div><Card className="p-4"><ComparadorFotos fotos={fotos}/></Card><div className="grid grid-cols-2 gap-2"><Button asChild><Link href="/progresso/avaliacao-visual">Avaliação visual</Link></Button><Button asChild variant="ghost"><Link href="/progresso">Voltar</Link></Button></div></div>;
}
