import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";

/** Carrega o snapshot persistido usado como valor inicial nas etapas. */
export async function carregarRespostasTriagem(): Promise<RespostasTriagem> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const perfil = await obterPerfilVigente(userId);
  return perfil?.respostas ?? {};
}
