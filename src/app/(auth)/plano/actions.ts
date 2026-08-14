"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { ativarPlano, obterOuGerarRascunhoComIA, substituirNoRascunho } from "@/domain/plano/repositorio";
import { conceder, consentimentosVigentes } from "@/domain/ia/consentimento";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";

async function contexto() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const perfil = await obterPerfilVigente(session.user.id);
  if (!perfil) redirect("/triagem");
  return { userId: session.user.id, perfil };
}

export async function gerarPlanoInicialAction(formData: FormData) {
  const { userId, perfil } = await contexto();
  if (formData.get("consentimentoIA") !== "sim") {
    redirect("/triagem/resumo?erro=Confirme o envio dos dados ao provedor de IA.");
  }

  const campos = obterRecorte("plano-inicial").campos.map((campo) => campo.id);
  const vigentes = await consentimentosVigentes(userId, "plano-inicial");
  const faltantes = campos.filter((campo) => !vigentes.includes(campo));
  await conceder(userId, "plano-inicial", faltantes, NOME_PROVEDOR);

  const resultado = await obterOuGerarRascunhoComIA(userId, perfil, campos, {
    tela: "resumo-triagem",
    rota: "/triagem/resumo",
    gatilho: "clique-gerar-meu-plano",
  });
  if (resultado.status === "indisponivel") {
    redirect(`/triagem/resumo?erro=${encodeURIComponent("O agent não conseguiu gerar seu plano agora. Tente novamente.")}`);
  }
  redirect("/plano/revisao");
}

export async function substituirExercicioAction(formData: FormData) {
  const { userId, perfil } = await contexto();
  await substituirNoRascunho(userId, {
    planoId: String(formData.get("planoId")),
    diaId: String(formData.get("diaId")),
    exercicioId: String(formData.get("exercicioId")),
    novoExercicioId: String(formData.get("novoExercicioId")),
  }, perfil.respostas);
  revalidatePath("/plano/revisao/treino");
}

export async function ativarPlanoAction(formData: FormData) {
  const { userId } = await contexto();
  await ativarPlano(userId, String(formData.get("planoId")));
  revalidatePath("/inicio");
  redirect("/inicio");
}
