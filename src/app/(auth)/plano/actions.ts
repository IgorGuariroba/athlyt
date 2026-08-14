"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { ativarPlano, obterOuGerarRascunhoComIA, substituirNoRascunho } from "@/domain/plano/repositorio";
import { conceder, estadoConsentimento } from "@/domain/ia/consentimento";
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

  // Concede na versão vigente do recorte. Campos consentidos numa versão
  // anterior contam como faltantes: a confirmação desta tela cobre o que o
  // recorte envia hoje, não o que enviava quando o consentimento foi dado.
  const campos = obterRecorte("plano-inicial").campos.map((campo) => campo.id);
  const estado = await estadoConsentimento(userId, "plano-inicial");
  const faltantes = campos.filter((campo) => !estado.vigentes.includes(campo));
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

export async function regenerarPlanoInicialAction() {
  const { userId, perfil } = await contexto();
  const estado = await estadoConsentimento(userId, "plano-inicial");

  // Regenerar com o recorte mais novo que o consentimento produziria um plano
  // cego (só o Núcleo) sem o usuário entender por quê. Manda reconfirmar em
  // vez de degradar em silêncio — ADR 0006, invariante 5.
  if (estado.precisaReconsentir) {
    redirect(
      `/triagem/resumo?erro=${encodeURIComponent(
        "O Athlyt passou a enviar dados diferentes ao provedor de IA. Confirme novamente para gerar outro plano com seu histórico corporal.",
      )}`,
    );
  }

  const resultado = await obterOuGerarRascunhoComIA(userId, perfil, estado.vigentes, {
    tela: "revisao-plano",
    rota: "/plano/revisao",
    gatilho: "clique-gerar-outro-plano",
  }, { forcarNovaGeracao: true });

  if (resultado.status === "indisponivel") {
    redirect(`/plano/revisao?erro=${encodeURIComponent("O agent não conseguiu gerar outro plano agora. Seu plano anterior foi mantido.")}`);
  }

  revalidatePath("/plano/revisao");
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
