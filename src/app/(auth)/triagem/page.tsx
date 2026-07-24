import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { proximaEtapaPendente } from "@/domain/triagem/suficiencia";

/**
 * Tela 004 — Início da triagem (specs/workflow/telas/004-inicio-
 * triagem.md). Redireciona para a próxima etapa não respondida — o
 * que também cobre "retomável de onde parou" quando o usuário
 * abandonou a cascata no meio (user story 5).
 */
export default async function InicioTriagemPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  const perfil = await obterPerfilVigente(userId);
  const proxima = proximaEtapaPendente(perfil?.respostas ?? {});

  redirect(proxima ? `/triagem/${proxima}` : "/triagem/resumo");
}
