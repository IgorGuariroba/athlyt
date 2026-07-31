"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { abandonarSessao, concluirSessao, iniciarSessao, registrarSerie, type MotivoAbandono } from "@/domain/sessao/repositorio";

async function usuario() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sessão expirada.");
  return session.user.id;
}

export async function iniciarSessaoAction(formData: FormData) {
  const sessao = await iniciarSessao(await usuario(), String(formData.get("diaId")));
  redirect(`/sessao/${sessao.id}`);
}

export async function registrarSerieAction(sessionId: string, formData: FormData) {
  await registrarSerie(await usuario(), sessionId, {
    exercicioId: String(formData.get("exercicioId")),
    numero: Number(formData.get("numero")),
    cargaKg: Number(formData.get("cargaKg")),
    repeticoes: Number(formData.get("repeticoes")),
    rir: Number(formData.get("rir")),
  });
  revalidatePath(`/sessao/${sessionId}`);
}

export async function concluirSessaoAction(sessionId: string) {
  await concluirSessao(await usuario(), sessionId);
  redirect(`/sessao/${sessionId}/resumo`);
}

export async function abandonarSessaoAction(sessionId: string, formData: FormData) {
  await abandonarSessao(await usuario(), sessionId, String(formData.get("motivo")) as MotivoAbandono);
  redirect(`/sessao/${sessionId}/resumo`);
}
