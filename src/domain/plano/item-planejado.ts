import {
  encontrarAlimentoPorNomeExato,
  macrosDaPorcao,
  macrosPorQuantidadeNutricional,
  porcoesDoAlimento,
} from "@/domain/alimentos/base";
import type { ItemPrato, OrigemDado } from "@/domain/alimentos/prato";
import type { Confianca } from "@/domain/alimentos/proveniencia";
import type { Macros } from "@/domain/diario/tipos";

/**
 * Alimento da prescrição com as duas quantidades que não podem ser
 * confundidas: a porção que o atleta reconhece e a quantidade
 * nutricional sobre a qual a composição foi calculada.
 */
export interface ItemPlanejado extends Macros {
  nome: string;
  porcaoDescrita: string;
  quantidade: number;
  unidade: "g" | "ml";
  alimentoId: string | null;
  origemDado: OrigemDado;
  fonte: string;
  versaoFonte: string;
  confianca: Confianca;
}

const ITEM_COM_PORCAO = /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(g|ml|un|unidade(?:s)?|fatias?)$/i;

function unidadeNatural(unidade: string): string | null {
  const normalizada = unidade.toLowerCase();
  if (["un", "unidade", "unidades"].includes(normalizada)) return "unidade";
  if (["fatia", "fatias"].includes(normalizada)) return "fatia";
  return null;
}

/**
 * Interpreta uma string de plano antigo somente quando alimento **e**
 * porção têm correspondência inequívoca na base. Busca parcial nunca
 * entra aqui: "pão" não pode virar pão francês sem o atleta escolher.
 */
export function interpretarItemPlanejadoLegadoNaBase(
  descricao: string,
): ItemPlanejado | null {
  const partes = ITEM_COM_PORCAO.exec(descricao.trim());
  if (!partes) return null;

  const nome = partes[1];
  const quantidadeTexto = partes[2];
  const unidadeTexto = partes[3];
  if (!nome || !quantidadeTexto || !unidadeTexto) return null;
  const alimento = encontrarAlimentoPorNomeExato(nome);
  if (!alimento) return null;

  const quantidadeDescrita = Number(quantidadeTexto.replace(",", "."));
  if (!Number.isFinite(quantidadeDescrita) || quantidadeDescrita <= 0) return null;

  const unidadeLida = unidadeTexto.toLowerCase();
  let quantidade: number;
  let unidade: "g" | "ml";
  let macros: Macros | null;

  if (unidadeLida === "g" || unidadeLida === "ml") {
    quantidade = quantidadeDescrita;
    unidade = unidadeLida;
    macros = macrosPorQuantidadeNutricional(alimento, quantidade, unidade);
  } else {
    const procurada = unidadeNatural(unidadeLida);
    const porcao = procurada
      ? porcoesDoAlimento(alimento.id).find((item) =>
          item.unidade.toLowerCase().startsWith(procurada),
        )
      : undefined;
    if (!porcao) return null;
    quantidade = quantidadeDescrita * porcao.gramas;
    unidade = "g";
    macros = macrosDaPorcao(alimento, { quantidade: quantidadeDescrita, unidade: porcao.unidade });
  }
  if (!macros) return null;

  return {
    nome: alimento.nome,
    porcaoDescrita: `${quantidadeTexto} ${unidadeTexto}`,
    quantidade,
    unidade,
    ...macros,
    alimentoId: alimento.id,
    origemDado: "base",
    fonte: alimento.proveniencia.fonte,
    versaoFonte: `${alimento.proveniencia.versao} (${alimento.proveniencia.atualizadaEm})`,
    confianca: alimento.confianca,
  };
}

export interface ItemPlanejadoProposto extends Macros {
  nome: string;
  porcaoDescrita: string;
  quantidade: number;
  unidade: "g" | "ml";
  confianca: Confianca;
}

/**
 * Enriquece a proposta da IA. Uma correspondência segura troca os
 * números propostos pela tabela; sem ela, preserva a estimativa e a
 * marca como tal — nunca promove busca aproximada a fonte analítica.
 */
export function materializarItemPlanejadoProposto(
  proposto: ItemPlanejadoProposto,
  modelo: string,
): ItemPlanejado {
  const daBase = interpretarItemPlanejadoLegadoNaBase(
    `${proposto.nome} ${proposto.porcaoDescrita}`,
  );
  if (daBase) return daBase;
  return {
    ...proposto,
    alimentoId: null,
    origemDado: "estimativa-ia",
    fonte: "Estimativa do plano alimentar",
    versaoFonte: modelo,
  };
}

/** Forma que a revisão e o Consumo Real já conhecem. */
export function itemPlanejadoParaPrato(item: ItemPlanejado): ItemPrato {
  return {
    descricao: `${item.nome} ${item.quantidade} ${item.unidade}`,
    calorias: item.calorias,
    proteinaG: item.proteinaG,
    carboidratosG: item.carboidratosG,
    gordurasG: item.gordurasG,
    fibrasG: item.fibrasG,
    alimentoId: item.alimentoId,
    quantidade: item.quantidade,
    unidade: item.unidade,
    origemDado: item.origemDado,
    fonte: item.fonte,
    versaoFonte: item.versaoFonte,
    confianca: item.confianca,
  };
}

/** Defesa determinística; o prompt sozinho não garante coerência. */
export function dentroDaToleranciaDaRefeicao(
  itens: readonly ItemPlanejado[],
  meta: Pick<Macros, "calorias" | "proteinaG">,
): boolean {
  const total = itens.reduce(
    (soma, item) => ({
      calorias: soma.calorias + item.calorias,
      proteinaG: soma.proteinaG + item.proteinaG,
    }),
    { calorias: 0, proteinaG: 0 },
  );
  const dentro = (valor: number, alvo: number, tolerancia: number) =>
    alvo === 0 ? valor === 0 : Math.abs(valor - alvo) / alvo <= tolerancia;
  return dentro(total.calorias, meta.calorias, 0.1) && dentro(total.proteinaG, meta.proteinaG, 0.15);
}

export function refeicoesPlanejadasValidas(
  refeicoes: readonly {
    calorias: number;
    proteinaG: number;
    itens: readonly (string | ItemPlanejado)[];
  }[],
): boolean {
  return refeicoes.every((refeicao) => {
    // Legado não é reprovado retroativamente: ainda precisa poder ser
    // ativado/lido até que uma nova geração o substitua.
    if (!refeicao.itens.every(ehItemPlanejado)) return true;
    return dentroDaToleranciaDaRefeicao(refeicao.itens, refeicao);
  });
}

export function descreverItemDoPlano(item: string | ItemPlanejado): string {
  return typeof item === "string" ? item : `${item.nome} ${item.porcaoDescrita}`;
}

export function ehItemPlanejado(valor: unknown): valor is ItemPlanejado {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Partial<ItemPlanejado>;
  return (
    typeof item.nome === "string" &&
    typeof item.porcaoDescrita === "string" &&
    typeof item.quantidade === "number" &&
    (item.unidade === "g" || item.unidade === "ml") &&
    typeof item.calorias === "number" &&
    typeof item.proteinaG === "number" &&
    typeof item.carboidratosG === "number" &&
    typeof item.gordurasG === "number" &&
    typeof item.fibrasG === "number" &&
    typeof item.origemDado === "string" &&
    typeof item.fonte === "string" &&
    typeof item.versaoFonte === "string" &&
    typeof item.confianca === "string"
  );
}
