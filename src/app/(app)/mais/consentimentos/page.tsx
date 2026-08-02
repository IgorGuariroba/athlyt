import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { revogarIAVisual, revogarStorageFotos } from "./actions";

export default async function ConsentimentosPage({ searchParams }: { searchParams: Promise<{ sucesso?: string; erro?: string }> }) {
  const session = await auth(); if (!session?.user?.id) redirect("/"); const aviso = await searchParams;
  const linhas = await db.select().from(consents).where(eq(consents.userId, session.user.id)).orderBy(desc(consents.concedidoEm));
  const visualAtivo = linhas.some((item) => item.operacao === "avaliacao-visual" && !item.revogadoEm); const storageAtivo = linhas.some((item) => item.operacao === "foto-corporal-armazenamento" && !item.revogadoEm);
  return <div className="flex flex-col gap-5 p-4"><div><p className="text-label-md uppercase text-muted-foreground">Mais</p><h1 className="text-headline-md font-bold">Consentimentos</h1><p className="text-body-sm text-muted-foreground">Revogar afeta usos futuros sem apagar a Trilha de Decisão histórica.</p></div>{aviso.sucesso ? <p role="status" className="text-success">{aviso.sucesso}</p> : null}{aviso.erro ? <p role="alert" className="text-error">{aviso.erro}</p> : null}
    <Card className="grid gap-3 p-4"><div><strong>Armazenamento de fotos</strong><p className="text-body-sm">Cloudflare R2 privado · {storageAtivo ? "ativo" : "não concedido ou revogado"}</p></div>{storageAtivo ? <form action={revogarStorageFotos}><Button variant="destructive">Revogar e excluir fotos</Button></form> : null}</Card>
    <Card className="grid gap-3 p-4"><div><strong>Análise visual por IA</strong><p className="text-body-sm">OpenRouter · {visualAtivo ? "ativo" : "não concedido ou revogado"}</p></div>{visualAtivo ? <form action={revogarIAVisual}><Button variant="outline">Revogar análise futura</Button></form> : null}</Card>
    <Card className="grid gap-2 p-4"><strong>Histórico</strong>{linhas.length ? linhas.slice(0, 20).map((item) => <p key={item.id} className="text-body-sm">{item.operacao} · {item.campo} · {item.revogadoEm ? `revogado em ${item.revogadoEm.toLocaleDateString("pt-BR")}` : "vigente"} · recorte v{item.recorteVersao}</p>) : <p className="text-body-sm text-muted-foreground">Nenhum consentimento registrado.</p>}</Card>
  </div>;
}
