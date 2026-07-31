import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obterRascunho } from "@/domain/plano/repositorio";

export default async function RevisaoPlanoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const plano = await obterRascunho(session.user.id);
  if (!plano) redirect("/plano/gerando");
  const { bloco, nutricao } = plano.conteudo;
  return <main className="flex flex-1 flex-col gap-6 px-6 py-8">
    <div><p className="text-body-sm text-muted-foreground">Seu programa</p><h1 className="text-headline-md font-bold">Revise seu Plano Ativo</h1></div>
    {plano.conteudo.modoConservador ? <Badge variant="secondary" className="w-fit">Modo Conservador</Badge> : null}
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex justify-between"><strong>Bloco de Treino</strong><Badge>{bloco.duracaoSemanas} semanas</Badge></div>
      <p className="text-body-md">{bloco.dias.length} dias por semana</p><p className="text-body-sm text-muted-foreground">{bloco.divisao}</p>
    </Card>
    <Card className="grid grid-cols-2 gap-4 p-5">
      <div><p className="text-body-sm text-muted-foreground">Meta diária</p><strong className="text-headline-sm">{nutricao.calorias} kcal</strong></div>
      <div><p className="text-body-sm text-muted-foreground">Proteína</p><strong className="text-headline-sm">{nutricao.proteinaG} g</strong></div>
      <div>Carboidratos: {nutricao.carboidratosG} g</div><div>Gorduras: {nutricao.gordurasG} g</div>
    </Card>
    <Button asChild size="lg" className="h-12"><Link href="/plano/revisao/treino">Revisar treinos</Link></Button>
  </main>;
}
