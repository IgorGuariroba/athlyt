"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { ativarPlano, substituirNoRascunho } from "@/domain/plano/repositorio";

async function contexto() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const perfil = await obterPerfilVigente(session.user.id);
  if (!perfil) redirect("/triagem");
  return { userId: session.user.id, perfil };
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
