"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { ativarPlano, obterOuGerarRascunhoComIA, substituirNoRascunho } from "@/domain/plano/repositorio";
import { conceder, estadoConsentimento } from "@/domain/ia/consentimento";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import type { OperacaoIA } from "@/domain/ia/contexto/tipos";

/** As duas operações que compõem o plano inicial. */
const OPERACOES_PLANO: readonly OperacaoIA[] = ["plano-treino", "plano-nutricao"];

/** União dos campos declarados pelas operações do plano. */
function camposDoPlano(): string[] {
  return [
    ...new Set(
      OPERACOES_PLANO.flatMap((operacao) =>
        obterRecorte(operacao).campos.map((campo) => campo.id),
      ),
    ),
  ];
}

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
  // O plano é gerado por duas operações (treino e nutrição), e o consentimento
  // é por operação: a mesma confirmação desta tela cobre as duas.
  const campos = camposDoPlano();
  for (const operacao of OPERACOES_PLANO) {
    const estado = await estadoConsentimento(userId, operacao);
    const declarados = obterRecorte(operacao).campos.map((campo) => campo.id);
    await conceder(
      userId,
      operacao,
      declarados.filter((campo) => !estado.vigentes.includes(campo)),
      NOME_PROVEDOR,
    );
  }

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

async function gerarOutroPlano({
  tela,
  rota,
  rotaErro,
}: {
  tela: string;
  rota: string;
  rotaErro: string;
}) {
  const { userId, perfil } = await contexto();
  const estados = await Promise.all(
    OPERACOES_PLANO.map((operacao) => estadoConsentimento(userId, operacao)),
  );
  const vigentes = [...new Set(estados.flatMap((estado) => estado.vigentes))];

  // Regenerar com o recorte mais novo que o consentimento produziria um plano
  // cego (só o Núcleo) sem o usuário entender por quê. Manda reconfirmar em
  // vez de degradar em silêncio — ADR 0006, invariante 5.
  if (estados.some((estado) => estado.precisaReconsentir)) {
    redirect(
      `/triagem/resumo?erro=${encodeURIComponent(
        "O Athlyt passou a enviar dados diferentes ao provedor de IA. Confirme novamente para gerar outro plano com seu histórico corporal.",
      )}`,
    );
  }

  const resultado = await obterOuGerarRascunhoComIA(
    userId,
    perfil,
    vigentes,
    {
      tela,
      rota,
      gatilho: "clique-gerar-outro-plano",
    },
    { forcarNovaGeracao: true },
  );

  if (resultado.status === "indisponivel") {
    redirect(
      `${rotaErro}?erro=${encodeURIComponent(
        "O agent não conseguiu gerar outro plano agora. Seu plano anterior foi mantido.",
      )}`,
    );
  }

  revalidatePath("/plano/revisao");
  redirect("/plano/revisao");
}

export async function regenerarPlanoInicialAction() {
  await gerarOutroPlano({
    tela: "revisao-plano",
    rota: "/plano/revisao",
    rotaErro: "/plano/revisao",
  });
}

export async function gerarNovoPlanoAtivoAction() {
  await gerarOutroPlano({
    tela: "refazer-plano-ativo",
    rota: "/mais/plano",
    rotaErro: "/mais/plano",
  });
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
  revalidatePath("/treino");
  redirect("/treino");
}
