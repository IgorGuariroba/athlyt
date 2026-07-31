import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { obterRascunho } from "@/domain/plano/repositorio";
import { ativarPlanoAction } from "../../actions";

export default async function RevisaoNutricaoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const plano = await obterRascunho(session.user.id);
  if (!plano) redirect("/plano/gerando");
  const meta = plano.conteudo.nutricao;
  return <main className="flex flex-1 flex-col gap-6 px-6 py-8">
    <div><p className="text-body-sm text-muted-foreground">Revisão do plano</p><h1 className="text-headline-md font-bold">Estratégia nutricional</h1></div>
    <Card className="flex flex-col gap-3 p-5"><strong>{meta.calorias} kcal por dia</strong><p>{meta.estrategia}</p><p className="text-body-sm text-muted-foreground">{meta.proteinaG} g proteína · {meta.carboidratosG} g carboidratos · {meta.gordurasG} g gorduras · {meta.fibrasG} g fibras</p></Card>
    <section className="flex flex-col gap-3"><h2 className="text-title-lg font-bold">Distribuição entre refeições</h2>{meta.refeicoes.map((r) => <Card key={r.nome} className="flex items-center justify-between p-4"><div><strong>{r.nome}</strong><p className="text-body-sm text-muted-foreground">{r.percentual}% da meta · {r.proteinaG} g proteína</p><ul className="mt-2 text-body-sm">{r.itens.map((item) => <li key={item}>{item}</li>)}</ul></div><span className="self-start font-semibold tabular-nums">{r.calorias} kcal</span></Card>)}</section>
    <p className="text-body-sm text-muted-foreground">As metas são estimativas iniciais determinísticas, não aconselhamento médico ou nutricional. Serão avaliadas com sua resposta real na Revisão Semanal.</p>
    <form action={ativarPlanoAction}><input type="hidden" name="planoId" value={plano.id}/><Button type="submit" size="lg" className="h-12 w-full">Ativar plano</Button></form>
  </main>;
}
