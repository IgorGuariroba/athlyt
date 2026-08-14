"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { solicitarMudancaDeObjetivo } from "@/domain/plano/reavaliacao";
import { parseRespostaEtapa } from "@/domain/triagem/validacao";

export async function alterarObjetivoAtual(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const resposta = parseRespostaEtapa("objetivo", formData);
  if (!resposta.ok || !resposta.dados.objetivoComposicao) {
    redirect(`/mais/objetivo?erro=${encodeURIComponent(resposta.ok ? "Selecione um objetivo." : resposta.erro)}`);
  }

  const resultado = await solicitarMudancaDeObjetivo(
    session.user.id,
    resposta.dados.objetivoComposicao,
  );
  if (!resultado.alterado) {
    redirect(`/mais/objetivo?aviso=${encodeURIComponent("Este já é seu objetivo atual.")}`);
  }

  revalidatePath("/mais/objetivo");
  revalidatePath("/progresso");
  revalidatePath("/inicio");
  const mensagem = resultado.planoJaAlinhado
    ? "Objetivo atualizado. Seu Plano Ativo já está alinhado a essa escolha."
    : "Objetivo atualizado. Seu Plano Ativo será reavaliado na próxima Revisão Semanal.";
  redirect(`/mais/objetivo?sucesso=${encodeURIComponent(mensagem)}`);
}
