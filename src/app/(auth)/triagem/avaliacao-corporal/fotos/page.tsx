import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { configuracaoR2, criarStorageR2 } from "@/infra/storage";
import { enviarFotosCorporais, excluirFotoCorporal, excluirTodasFotosCorporais } from "./actions";

export default async function FotosAvaliacaoPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const mensagens = await searchParams;
  const config = configuracaoR2();
  const panorama = await obterPanoramaCorporal(session.user.id);
  const urls = config ? await Promise.all(panorama.fotos.slice(0, 4).map(async (foto) => ({ foto, url: await criarStorageR2(config).urlLeitura(foto.objectKey) }))) : [];
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5">
    <div><p className="text-label-md uppercase text-muted-foreground">Fotos opcionais</p><h1 className="text-headline-md font-bold">Comparação visual padronizada</h1><p className="text-body-sm text-muted-foreground">Frente, costas e laterais precisam de pose, distância e iluminação semelhantes. Metadados são removidos e os arquivos são convertidos para WebP antes do armazenamento.</p></div>
    {mensagens.erro ? <p role="alert" className="text-body-sm text-error">{mensagens.erro}</p> : null}{mensagens.sucesso ? <p role="status" className="text-body-sm text-success">{mensagens.sucesso}</p> : null}
    {!config ? <Card className="p-4 text-body-sm text-muted-foreground"><strong className="text-on-surface">Cloudflare R2 ainda não configurado</strong><p>Preencha as quatro variáveis `R2_*` do `.env`. O bucket deve permanecer privado.</p></Card> : <form action={enviarFotosCorporais} className="grid gap-4">
      {[["frente","Frente"],["costas","Costas"],["lateralDireita","Lateral direita"],["lateralEsquerda","Lateral esquerda"]].map(([nome, rotulo]) => <div key={nome}><Label htmlFor={nome}>{rotulo}</Label><Input id={nome} name={nome} type="file" accept="image/jpeg,image/png,image/webp" /></div>)}
      <div><Label htmlFor="condicoes">Condições</Label><Input id="condicoes" name="condicoes" placeholder="Iluminação, distância ou observações" /></div>
      <div><Label htmlFor="retencaoDias">Retenção</Label><select id="retencaoDias" name="retencaoDias" className="w-full rounded-md border bg-background p-3"><option value="0">Até eu excluir</option><option value="365">Excluir após 1 ano</option><option value="730">Excluir após 2 anos</option></select></div>
      <label className="flex items-start gap-2 text-body-sm"><input type="checkbox" name="consentimentoArmazenamento" value="sim" required className="mt-1"/><span>Autorizo armazenar estas fotos corporais no bucket privado Cloudflare R2 para comparação longitudinal. Este consentimento não autoriza análise por IA.</span></label>
      <Button size="lg" type="submit">Enviar para storage privado</Button>
    </form>}
    {urls.length ? <Card className="grid gap-3 p-4"><div className="flex items-center justify-between"><strong>Fotos privadas recentes</strong><form action={excluirTodasFotosCorporais}><Button type="submit" size="sm" variant="destructive">Excluir todas</Button></form></div>{urls.map(({ foto, url }) => <div key={foto.id} className="flex items-center justify-between gap-3"><a href={url} target="_blank" rel="noreferrer" className="text-body-sm underline capitalize">Abrir {foto.pose.replaceAll("_", " ")} — link temporário</a><form action={excluirFotoCorporal}><input type="hidden" name="fotoId" value={foto.id}/><Button type="submit" size="sm" variant="ghost">Excluir</Button></form></div>)}</Card> : null}
    <div className="mt-auto grid gap-3"><Button asChild variant="secondary"><Link href="/triagem/objetivo">Continuar</Link></Button><Button asChild variant="ghost"><Link href="/triagem/avaliacao-corporal/essenciais">Revisar medidas</Link></Button></div>
  </main>;
}
