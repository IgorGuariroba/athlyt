import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listarTrilhas } from "@/domain/ia/trilha";

export default async function TrilhasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const trilhas = await listarTrilhas(session.user.id);
  return <main className="flex flex-col gap-5 p-4">
    <div><p className="text-body-sm text-muted-foreground">Mais</p><h1 className="text-headline-md font-bold">Trilhas de Decisão</h1></div>
    {trilhas.length === 0 ? <Card className="p-4 text-muted-foreground">Nenhuma decisão registrada.</Card> : trilhas.map((trilha) => {
      const resultado = trilha.resultado as Record<string, unknown> | null;
      return <Card key={trilha.id} className="flex flex-col gap-2 p-4">
        <div className="flex justify-between"><strong>{trilha.operacao === "plano-inicial" ? "Plano inicial" : trilha.operacao}</strong><Badge variant={trilha.auditavel ? "default" : "secondary"}>{trilha.auditavel ? "Auditável" : "Não auditável"}</Badge></div>
        <p className="text-body-sm">Regra/modelo: {trilha.modeloResolvido ?? trilha.modeloSolicitado}</p>
        <p className="text-body-sm">Perfil v{trilha.perfilVersao} · dados usados: {(trilha.camposEnviados as string[]).join(", ") || "nenhum"}</p>
        {resultado ? <p className="text-body-sm text-muted-foreground">Resultado: {resultado.tipo ? String(resultado.tipo) : "decisão registrada"}{resultado.de ? ` · ${resultado.de} → ${resultado.para}` : ""}</p> : null}
        <time className="text-body-sm text-muted-foreground">{trilha.createdAt.toLocaleString("pt-BR")}</time>
      </Card>;
    })}
  </main>;
}
