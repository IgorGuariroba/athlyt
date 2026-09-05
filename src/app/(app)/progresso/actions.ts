"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import type { EstadoRegistroPeso } from "@/components/progresso/painel-peso";
import { registrarPesoEMeta } from "@/domain/medicoes/repositorio";

export async function salvarPesoEMeta(
  _estado: EstadoRegistroPeso,
  dados: FormData,
): Promise<EstadoRegistroPeso> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const pesoAtualKg = Number(dados.get("pesoAtualKg"));
  const pesoMetaKg = Number(dados.get("pesoMetaKg"));
  if (![pesoAtualKg, pesoMetaKg].every((peso) => Number.isFinite(peso) && peso >= 30 && peso <= 300)) {
    return { erro: "Informe os pesos entre 30 e 300 kg." };
  }

  try {
    await registrarPesoEMeta(session.user.id, { pesoAtualKg, pesoMetaKg });
    invalidarLeituras([{ fato: "medicoes" }]);
    return { sucesso: "Peso atual e nova meta salvos." };
  } catch {
    return { erro: "Não foi possível salvar os pesos." };
  }
}
