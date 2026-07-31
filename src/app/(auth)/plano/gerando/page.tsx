import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { obterOuGerarRascunho } from "@/domain/plano/repositorio";
import { TransicaoGeracao } from "./transicao-geracao";

/** Tela 025 — a geração é síncrona e determinística; esta rota materializa o rascunho e segue para revisão. */
export default async function GerandoPlanoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const perfil = await obterPerfilVigente(session.user.id);
  if (!perfil) redirect("/triagem");
  await obterOuGerarRascunho(session.user.id, perfil);
  return <TransicaoGeracao />;
}
