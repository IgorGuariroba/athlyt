"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { escalarMacros } from "@/domain/diario/cardapio";
import { alternarFavorito, registrarPrato, salvarAlimentoProprio } from "@/domain/alimentos/repositorio";
import { itemDeAlimento, itemEstimado, itemManual, type ItemPrato } from "@/domain/alimentos/prato";
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
  const itens = (bruto as ItemPrato[]).map((item) => {
    if (item.alimentoId) {
      return itemDeAlimento(item.alimentoId, { quantidade: item.quantidade, unidade: item.unidade });
    }
    // Estimativa de foto preserva a origem: reconstruir como entrada
    // manual apagaria da auditoria que aquele número veio de uma foto,
    // e a ponderação de fontes trata as duas com credenciais distintas.
    if (item.origemDado === "estimativa-ia") {
      return itemEstimado({
        descricao: item.descricao.replace(/\s\d+\s?g$/, ""),
        quantidadeGramas: item.quantidade ?? 100,
        calorias: item.calorias, proteinaG: item.proteinaG,
        carboidratosG: item.carboidratosG, gordurasG: item.gordurasG, fibrasG: item.fibrasG,
        confianca: item.confianca ?? "baixa",
        modelo: item.versaoFonte ?? "modelo não identificado",
      });
    }
    return itemManual({
      nome: item.descricao,
      quantidade: item.quantidade ?? 1,
      unidade: item.unidade ?? "porção",
      calorias: item.calorias, proteinaG: item.proteinaG,
      carboidratosG: item.carboidratosG, gordurasG: item.gordurasG, fibrasG: item.fibrasG,
    });
  });

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

/**
 * Tela 052 — "salvar como alimento reutilizável".
 *
 * O que o atleta digitou uma vez fica disponível na biblioteca; sem
 * isso, a entrada manual obrigaria a redigitar os mesmos macros toda
 * vez, que é exatamente o atrito que os Atalhos existem para remover.
 */
export async function salvarAlimentoProprioAction(formData: FormData) {
  const gramasPorcao = Number(formData.get("gramasPorcao")) || 100;
  const numero = (campo: string) => Number(formData.get(campo)) || 0;
  // Os macros chegam para a porção informada; a biblioteca guarda por
  // 100 g, que é a base comum de toda a base nutricional.
  const fator = 100 / gramasPorcao;
  await salvarAlimentoProprio(await usuario(), {
    nome: String(formData.get("nome")).trim(),
    por100g: {
      calorias: Math.round(numero("calorias") * fator),
      proteinaG: Math.round(numero("proteinaG") * fator),
      carboidratosG: Math.round(numero("carboidratosG") * fator),
      gordurasG: Math.round(numero("gordurasG") * fator),
      fibrasG: Math.round(numero("fibrasG") * fator),
    },
    porcoes: [{ unidade: String(formData.get("unidade") || "porção"), gramas: gramasPorcao }],
  });
  revalidatePath("/diario/registrar");
}
