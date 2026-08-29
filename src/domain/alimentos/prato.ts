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

/**
 * De onde o modelo tirou a estimativa. Não é rótulo cosmético: uma
 * foto erra a porção mas vê o alimento; uma descrição acerta o
 * alimento e chuta a porção. Guardar a origem é o que permite ao
 * atleta, meses depois, saber qual desconfiança aplicar ao número.
 */
export type OrigemEstimativa = "foto" | "texto" | "audio";

export const FONTE_ESTIMATIVA: Record<OrigemEstimativa, string> = {
  foto: "Estimativa por foto",
  texto: "Estimativa por descrição",
  audio: "Estimativa por áudio descrito",
};

export interface EntradaEstimada extends Macros {
  descricao: string;
  quantidadeGramas: number;
  confianca: Confianca;
  /** Modelo que produziu a estimativa, para a auditoria do registro. */
  modelo: string;
  /** Padrão `foto` para não reescrever o registro histórico já gravado. */
  origemEstimativa?: OrigemEstimativa;
}

/**
 * Item estimado pela IA a partir da foto do prato.
 *
 * Origem própria (`estimativa-ia`) em vez de reaproveitar
 * `itemManual`: as duas são incertas, mas por motivos diferentes — o
 * atleta que digita sabe o que comeu e erra o número; o modelo que
 * olha a foto pode errar o próprio alimento. A ponderação de fontes
 * (`proveniencia.ts`) já dá a `estimativa-ia` a menor credencial de
 * todas, e apagar essa distinção no registro tornaria impossível
 * revisar depois o que veio de foto.
 *
 * A confiança vem do modelo por item, e não do conjunto: numa foto,
 * o frango costuma ser identificável e o óleo do preparo, não.
 */
export function itemEstimado(entrada: EntradaEstimada): ItemPrato {
  const gramas = Math.max(1, Math.round(entrada.quantidadeGramas));
  return {
    descricao: `${entrada.descricao} ${gramas} g`,
    calorias: Math.round(entrada.calorias),
    proteinaG: Math.round(entrada.proteinaG),
    carboidratosG: Math.round(entrada.carboidratosG),
    gordurasG: Math.round(entrada.gordurasG),
    fibrasG: Math.round(entrada.fibrasG),
    alimentoId: null,
    quantidade: gramas,
    unidade: "g",
    origemDado: "estimativa-ia",
    fonte: FONTE_ESTIMATIVA[entrada.origemEstimativa ?? "foto"],
    versaoFonte: entrada.modelo,
    confianca: entrada.confianca,
  };
}

/**
 * Reescala um item mantendo proveniência e confiança.
 *
 * É a operação que a tela de foto usa quando o atleta corrige a
 * porção estimada ("era meia concha"): corrigir quantidade não
 * transforma uma estimativa de IA em medição, então a origem
 * permanece — só os números mudam.
 */
export function reescalarItem(item: ItemPrato, gramas: number): ItemPrato {
  const alvo = Math.max(1, Math.round(gramas));
  const fator = alvo / Math.max(1, item.quantidade);
  return {
    ...item,
    descricao: item.descricao.replace(/\s\d+\s?g$/, "") + ` ${alvo} g`,
    quantidade: alvo,
    unidade: "g",
    calorias: Math.round(item.calorias * fator),
    proteinaG: Math.round(item.proteinaG * fator),
    carboidratosG: Math.round(item.carboidratosG * fator),
    gordurasG: Math.round(item.gordurasG * fator),
    fibrasG: Math.round(item.fibrasG * fator),
  };
}

/**
 * Corrige a descrição mantendo números e proveniência.
 *
 * É a operação da revisão de estimativa quando o modelo entendeu o
 * alimento errado ("frango" onde era peru). Diferente de reescalar,
 * ela não toca nos macros: quem renomeia está dizendo o que era, não
 * quanto era — e ajustar os dois de uma vez esconderia do atleta qual
 * das duas coisas ele acabou de mudar.
 */
export function renomearItem(item: ItemPrato, nome: string): ItemPrato {
  const sufixo = item.unidade === "g" ? ` ${item.quantidade} g` : "";
  return { ...item, descricao: `${nome.trim()}${sufixo}` };
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
