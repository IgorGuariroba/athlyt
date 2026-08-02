"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { escalarMacros } from "@/domain/diario/cardapio";
import { alternarFavorito, registrarPrato } from "@/domain/alimentos/repositorio";
import { itemDeAlimento, itemManual, type ItemPrato } from "@/domain/alimentos/prato";
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

/**
 * Tela 058 — registra o Prato inteiro de uma vez.
 *
 * Os itens chegam serializados porque o Prato é montado no cliente. O
 * servidor não confia neles cegamente: itens vindos da base são
 * recalculados a partir do catálogo, de modo que um payload adulterado
 * não consiga inventar macros para um alimento conhecido.
 */
export async function registrarPratoAction(formData: FormData) {
  const dia = String(formData.get("dia"));
  const fuso = String(formData.get("fuso"));
  const nome = String(formData.get("nome") ?? "").trim();
  const bruto: unknown = JSON.parse(String(formData.get("itens") ?? "[]"));
  if (!Array.isArray(bruto) || bruto.length === 0) {
    throw new Error("Um registro precisa de ao menos um item no Prato.");
  }
  const itens = (bruto as ItemPrato[]).map((item) =>
    item.alimentoId
      ? itemDeAlimento(item.alimentoId, { quantidade: item.quantidade, unidade: item.unidade })
      : itemManual({
          nome: item.descricao,
          quantidade: item.quantidade ?? 1,
          unidade: item.unidade ?? "porção",
          calorias: item.calorias, proteinaG: item.proteinaG,
          carboidratosG: item.carboidratosG, gordurasG: item.gordurasG, fibrasG: item.fibrasG,
        }),
  );

  await registrarPrato(await usuario(), { nome: nome || "Registro avulso", itens, dia, fuso });
  revalidatePath("/diario");
  revalidatePath("/inicio");
  redirect(`/diario?dia=${dia}`);
}

/** Tela 053 — marca/desmarca um alimento da base como favorito. */
export async function favoritarAction(formData: FormData) {
  await alternarFavorito(await usuario(), String(formData.get("alimentoId")));
  revalidatePath("/diario/registrar");
}
