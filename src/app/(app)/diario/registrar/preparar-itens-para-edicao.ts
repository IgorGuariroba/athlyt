import type { ItemPrato } from "@/domain/alimentos/prato";
import {
  interpretarItemPlanejadoLegadoNaBase,
  itemPlanejadoParaPrato,
} from "@/domain/plano/item-planejado";
import type { ItemAlimentar } from "@/domain/diario/tipos";

export type ResultadoPreparacaoItens =
  | { ok: true; itens: ItemPrato[] }
  | { ok: false; erro: string };

/**
 * Proposta não persistida para editar consumos gravados antes de o
 * plano carregar quantidade e proveniência por item.
 *
 * A base resolve primeiro. Só os itens restantes vão juntos ao
 * fallback de IA, e qualquer falha invalida a proposta inteira: uma
 * lista parcialmente reidratada reproduziria o `undefined` que este
 * adaptador existe para eliminar. O consumo no banco nunca é tocado;
 * quem persiste continua sendo a confirmação final da tela.
 */
export async function prepararItensParaEdicao(
  itens: readonly ItemAlimentar[],
  estimarRestantes: (descricoes: readonly string[]) => Promise<ResultadoPreparacaoItens>,
): Promise<ResultadoPreparacaoItens> {
  const preparados: Array<ItemPrato | null> = itens.map((item) => {
    if (ehItemPrato(item)) return item;
    const planejado = interpretarItemPlanejadoLegadoNaBase(item.descricao);
    return planejado ? itemPlanejadoParaPrato(planejado) : null;
  });
  const pendentes = preparados.flatMap((item, indice) => item ? [] : [indice]);
  if (pendentes.length === 0) return { ok: true, itens: preparados as ItemPrato[] };

  const resultado = await estimarRestantes(pendentes.map((indice) => itens[indice].descricao));
  if (!resultado.ok) return resultado;
  if (resultado.itens.length !== pendentes.length || !resultado.itens.every(ehItemPrato)) {
    return {
      ok: false,
      erro: "Não consegui preparar os alimentos antigos para edição. Tente novamente.",
    };
  }

  pendentes.forEach((indice, posicao) => {
    preparados[indice] = resultado.itens[posicao];
  });
  return { ok: true, itens: preparados as ItemPrato[] };
}

/** Guarda de runtime: JSON persistido não ganha campos por causa de um cast TypeScript. */
export function ehItemPrato(item: ItemAlimentar): item is ItemPrato {
  const candidato = item as Partial<ItemPrato>;
  return (
    typeof candidato.quantidade === "number" &&
    Number.isFinite(candidato.quantidade) &&
    candidato.quantidade > 0 &&
    (candidato.unidade === "g" || candidato.unidade === "ml") &&
    (candidato.origemDado === "base" ||
      candidato.origemDado === "usuario" ||
      candidato.origemDado === "estimativa-ia") &&
    typeof candidato.fonte === "string" &&
    typeof candidato.versaoFonte === "string" &&
    (candidato.confianca === "alta" ||
      candidato.confianca === "media" ||
      candidato.confianca === "baixa")
  );
}
