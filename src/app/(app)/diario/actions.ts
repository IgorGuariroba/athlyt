"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { escalarMacros } from "@/domain/diario/cardapio";
import {
  confirmarRefeicao,
  desfazerConfirmacao,
  obterEntradaPlanejada,
} from "@/domain/diario/repositorio";
import type { ItemAlimentar } from "@/domain/diario/tipos";

async function usuario() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sessão expirada.");
  return session.user.id;
}

function contexto(formData: FormData) {
  return {
    dia: String(formData.get("dia")),
    fuso: String(formData.get("fuso")),
    refeicaoRef: String(formData.get("refeicaoRef")),
  };
}

/** Tela 047 — confirmar em um toque. */
export async function confirmarRefeicaoAction(formData: FormData) {
  const { dia, fuso, refeicaoRef } = contexto(formData);
  await confirmarRefeicao(await usuario(), { refeicaoRef, dia, fuso });
  revalidatePath("/diario");
  revalidatePath("/inicio");
}

export async function desfazerConfirmacaoAction(formData: FormData) {
  const { dia, fuso, refeicaoRef } = contexto(formData);
  await desfazerConfirmacao(await usuario(), { refeicaoRef, dia, fuso });
  revalidatePath("/diario");
  revalidatePath("/inicio");
}

/**
 * Tela 048 — editar antes de confirmar. As porções vêm como fator por
 * item (0 = não comi); o consumo gravado é o real, e o planejado
 * continua ao lado como referência neutra.
 */
export async function confirmarRefeicaoEditadaAction(formData: FormData) {
  const { dia, fuso, refeicaoRef } = contexto(formData);
  const userId = await usuario();
  const planejada = await obterEntradaPlanejada(userId, refeicaoRef);
  if (!planejada) throw new Error("Refeição não pertence ao Cardápio Diário.");

  const itens: ItemAlimentar[] = planejada.itens.flatMap((item, indice) => {
    const fator = Number(formData.get(`porcao-${indice}`) ?? 1);
    if (!Number.isFinite(fator) || fator <= 0) return [];
    return [
      {
        descricao: fator === 1 ? item.descricao : `${item.descricao} (${fator}×)`,
        ...escalarMacros(item, fator),
      },
    ];
  });

  await confirmarRefeicao(userId, { refeicaoRef, itens, dia, fuso });
  revalidatePath("/diario");
  revalidatePath("/inicio");
  redirect(`/diario?dia=${dia}`);
}
