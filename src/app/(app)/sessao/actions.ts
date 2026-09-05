"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import type { MotivoSubstituicao } from "@/domain/plano/substituicoes";
import { abandonarSessao, concluirSessao, iniciarSessao, registrarSerie, substituirExercicioNaSessao, type MotivoAbandono } from "@/domain/sessao/repositorio";

async function usuario() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sessão expirada.");
  return session.user.id;
}

export async function iniciarSessaoAction(formData: FormData) {
  const sessao = await iniciarSessao(await usuario(), String(formData.get("diaId")));
  const destino = `/sessao/${sessao.id}`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessao.id }], { destino });
  redirect(destino);
}

export async function registrarSerieAction(sessionId: string, formData: FormData) {
  await registrarSerie(await usuario(), sessionId, {
    exercicioId: String(formData.get("exercicioId")),
    numero: Number(formData.get("numero")),
    cargaKg: Number(formData.get("cargaKg")),
    repeticoes: Number(formData.get("repeticoes")),
    rir: Number(formData.get("rir")),
  });
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }]);
}

export async function substituirExercicioAction(sessionId: string, formData: FormData) {
  const observacao = String(formData.get("observacao") ?? "").trim();
  const sessao = await substituirExercicioNaSessao(await usuario(), sessionId, {
    exercicioId: String(formData.get("exercicioId")),
    novoExercicioId: String(formData.get("novoExercicioId")),
    motivo: String(formData.get("motivo")) as MotivoSubstituicao,
    observacao: observacao || undefined,
  });
  const indice = sessao.exercicios.findIndex((item) => item.exercicioId === String(formData.get("novoExercicioId")));
  const destino = `/sessao/${sessionId}?exercicio=${Math.max(indice, 0)}`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }], { destino });
  redirect(destino);
}

export async function concluirSessaoAction(sessionId: string) {
  await concluirSessao(await usuario(), sessionId);
  const destino = `/sessao/${sessionId}/resumo`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }], { destino });
  redirect(destino);
}

export async function abandonarSessaoAction(sessionId: string, formData: FormData) {
  await abandonarSessao(await usuario(), sessionId, String(formData.get("motivo")) as MotivoAbandono);
  const destino = `/sessao/${sessionId}/resumo`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }], { destino });
  redirect(destino);
}
