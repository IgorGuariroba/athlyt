/**
 * Prato — montagem de múltiplos alimentos registrada de uma vez
 * (CONTEXT.md > Prato; tela 058; user story 49d).
 *
 * O Prato é uma lista imutável: cada operação devolve um novo array.
 * Isso mantém o estado fora do React previsível e evita a classe de
 * bug registrada em `docs/memory/estado-offline-fora-do-react.md`.
 *
 * Cada item carrega sua própria proveniência em vez de referenciar a
 * base: o que foi comido em 2026 precisa continuar auditável mesmo
 * depois de a base ser atualizada.
 */

import type { ItemAlimentar, Macros } from "@/domain/diario/tipos";
import { somarMacros } from "@/domain/diario/cardapio";
import {
  descreverPorcao,
  encontrarAlimento,
  macrosDaPorcao,
  type QuantidadeInformada,
} from "./base";
import type { Confianca } from "./proveniencia";

export type OrigemDado = "base" | "usuario" | "estimativa-ia";

/**
 * Item do Prato. Estende `ItemAlimentar` (o que o Diário grava) com a
 * proveniência exigida pelas user stories 57 e 59 — o consumo
 * registrado precisa dizer de onde veio cada número.
 */
export interface ItemPrato extends ItemAlimentar {
  alimentoId: string | null;
  quantidade: number;
  unidade: string;
  origemDado: OrigemDado;
  fonte: string;
  versaoFonte: string;
  confianca: Confianca;
}

export function itemDeAlimento(alimentoId: string, porcao: QuantidadeInformada): ItemPrato {
  const alimento = encontrarAlimento(alimentoId);
  if (!alimento) throw new Error(`Alimento desconhecido: ${alimentoId}.`);
  const macros = macrosDaPorcao(alimento, porcao);
  return {
    descricao: descreverPorcao(alimento, porcao),
    ...macros,
    alimentoId: alimento.id,
    quantidade: porcao.quantidade,
    unidade: porcao.unidade,
    origemDado: "base",
    fonte: alimento.proveniencia.fonte,
    versaoFonte: `${alimento.proveniencia.versao} (${alimento.proveniencia.atualizadaEm})`,
    confianca: alimento.confianca,
  };
}

export interface EntradaManual extends Macros {
  nome: string;
  quantidade: number;
  unidade: string;
}

/**
 * Entrada manual (tela 052). Confiança sempre baixa e origem
 * declarada: o atleta informou de memória ou de um rótulo lido às
 * pressas, e tratar isso como equivalente a uma tabela analítica
 * falsificaria a auditoria dos cálculos.
 */
export function itemManual(entrada: EntradaManual): ItemPrato {
  const quantidade = Number.isInteger(entrada.quantidade)
    ? String(entrada.quantidade)
    : String(entrada.quantidade).replace(".", ",");
  return {
    descricao: `${entrada.nome} ${quantidade} ${entrada.unidade}`.trim(),
    calorias: Math.round(entrada.calorias),
    proteinaG: Math.round(entrada.proteinaG),
    carboidratosG: Math.round(entrada.carboidratosG),
    gordurasG: Math.round(entrada.gordurasG),
    fibrasG: Math.round(entrada.fibrasG),
    alimentoId: null,
    quantidade: entrada.quantidade,
    unidade: entrada.unidade,
    origemDado: "usuario",
    fonte: "Informado por você",
    versaoFonte: "entrada manual",
    confianca: "baixa",
  };
}

export function adicionarAoPrato(prato: readonly ItemPrato[], item: ItemPrato): ItemPrato[] {
  return [...prato, item];
}

export function removerDoPrato(prato: readonly ItemPrato[], indice: number): ItemPrato[] {
  if (indice < 0 || indice >= prato.length) return [...prato];
  return prato.filter((_, i) => i !== indice);
}

export function subtotalDoPrato(prato: readonly ItemPrato[]): Macros {
  return somarMacros(prato.map((item) => item));
}
