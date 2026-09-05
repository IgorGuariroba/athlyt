"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import type { MotivoSubstituicao } from "@/domain/plano/substituicoes";
import { abandonarSessao, concluirSessao, iniciarSessao, registrarSerie, substituirExercicioNaSessao, type MotivoAbandono } from "@/domain/sessao/repositorio";
import { campoNumero, campoTexto } from "@/lib/form-data";

async function usuario() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sessão expirada.");
  return session.user.id;
}

export async function iniciarSessaoAction(formData: FormData) {
  const sessao = await iniciarSessao(await usuario(), campoTexto(formData, "diaId"));
  const destino = `/sessao/${sessao.id}`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessao.id }], { destino });
  redirect(destino);
}

export async function registrarSerieAction(sessionId: string, formData: FormData) {
  await registrarSerie(await usuario(), sessionId, {
    exercicioId: campoTexto(formData, "exercicioId"),
    numero: campoNumero(formData, "numero"),
    cargaKg: campoNumero(formData, "cargaKg"),
    repeticoes: campoNumero(formData, "repeticoes"),
    rir: campoNumero(formData, "rir"),
  });
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }]);
}

export async function substituirExercicioAction(sessionId: string, formData: FormData) {
  const observacao = campoTexto(formData, "observacao").trim();
  const novoExercicioId = campoTexto(formData, "novoExercicioId");
  const sessao = await substituirExercicioNaSessao(await usuario(), sessionId, {
    exercicioId: campoTexto(formData, "exercicioId"),
    novoExercicioId,
    motivo: campoTexto(formData, "motivo") as MotivoSubstituicao,
    observacao: observacao || undefined,
  });
  const indice = sessao.exercicios.findIndex((item) => item.exercicioId === novoExercicioId);
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
  await abandonarSessao(await usuario(), sessionId, campoTexto(formData, "motivo") as MotivoAbandono);
  const destino = `/sessao/${sessionId}/resumo`;
  invalidarLeituras([{ fato: "sessao", sessaoId: sessionId }], { destino });
  redirect(destino);
}
