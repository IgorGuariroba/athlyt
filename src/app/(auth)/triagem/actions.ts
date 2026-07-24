"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { registrarRespostas } from "@/domain/triagem/perfil";
import { parseRespostaEtapa } from "@/domain/triagem/validacao";
import { isEtapaId, type EtapaId } from "@/domain/triagem/etapas";

/**
 * Submete uma etapa da cascata (specs/workflow/telas 005–023): valida
 * o FormData, registra a resposta como nova versão do perfil e
 * redireciona para a próxima etapa informada pelo cliente (a ordem
 * fixa vive em `ETAPAS_TRIAGEM`, o form embute o próximo passo em um
 * campo oculto para não duplicar essa regra na server action).
 *
 * Em erro de validação, retorna a mensagem para a página re-renderizar
 * o formulário com o erro — mantendo "uma pergunta por tela" mesmo em
 * caso de engano do usuário.
 */
export async function submeterEtapaTriagem(
  etapaAtual: string,
  proximaEtapa: string,
  formData: FormData,
): Promise<{ erro: string } | void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  if (!isEtapaId(etapaAtual)) {
    throw new Error(`Etapa de triagem desconhecida: ${etapaAtual}`);
  }

  const resultado = parseRespostaEtapa(etapaAtual, formData);
  if (!resultado.ok) {
    return { erro: resultado.erro };
  }

  await registrarRespostas(userId, resultado.dados);

  const destino: EtapaId | "resumo" = isEtapaId(proximaEtapa)
    ? proximaEtapa
    : "resumo";
  redirect(
    destino === "resumo" ? "/triagem/resumo" : `/triagem/${destino}`,
  );
}
