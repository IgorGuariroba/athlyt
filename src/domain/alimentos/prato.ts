/**
 * Prato — montagem de múltiplos alimentos registrada de uma vez.
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
 * Unidade em que a IA declara a quantidade de um item estimado.
 *
 * Sólido em gramas, líquido em mililitros — porque é assim que o
 * atleta reconhece o que consumiu: uma lata de refrigerante é "350
 * ml", nunca "370 g". Forçar tudo a gramas obrigava o modelo a
 * converter volume em massa por conta própria, o que ele faz com
 * densidade inventada e sem dizer que inventou.
 *
 * **Mililitro nunca é convertido em grama.** A conversão exigiria uma
 * densidade por alimento, que nenhuma fonte deste app fornece — e a
 * ponderação de `proveniencia.ts` não tem de onde tirá-la. A unidade
 * é a que o modelo declarou, e reescalar é proporcional dentro dela.
 */
export type UnidadeEstimada = "g" | "ml";

/**
 * Sufixo de quantidade na descrição ("Arroz cozido 150 g",
 * "Coca-Cola Zero 250 ml").
 *
 * Um único ponto de verdade: o mesmo padrão que escreve o sufixo é o
 * que o remove. Antes existiam quatro cópias de `/\s\d+\s?g$/`
 * espalhadas por telas e actions, e nenhuma delas reconhecia `ml` —
 * bastava o modelo declarar um líquido para o nome do item aparecer
 * com a quantidade grudada.
 */
const SUFIXO_QUANTIDADE = /\s\d+\s?(?:g|ml)$/i;

/** Sufixo canônico da descrição, para as unidades que o item conhece. */
function sufixoDe(item: Pick<ItemPrato, "quantidade" | "unidade">): string {
  return item.unidade === "g" || item.unidade === "ml"
    ? ` ${item.quantidade} ${item.unidade}`
    : "";
}

/**
 * Item do Prato. Estende `ItemAlimentar` (o que o Diário grava) com
 * proveniência: o consumo registrado precisa dizer de onde veio cada
 * número e com que confiança.
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
 * Entrada manual. Confiança sempre baixa e origem
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

/**
 * Origem da estimativa **daquele item**, e não da tela.
 *
 * Um prato fotografado pode conter linhas que já não vieram da foto:
 * basta o atleta corrigir o alimento e recalcular. Perguntar à tela
 * de onde veio o número faria a linha recalculada dizer "alimento e
 * porção claros na foto" sobre algo que a foto nunca mostrou.
 */
export function origemDaEstimativa(
  item: Pick<ItemPrato, "fonte">,
  padrao: OrigemEstimativa,
): OrigemEstimativa {
  const encontrada = (Object.keys(FONTE_ESTIMATIVA) as OrigemEstimativa[]).find(
    (chave) => FONTE_ESTIMATIVA[chave] === item.fonte,
  );
  return encontrada ?? padrao;
}

export interface EntradaEstimada extends Macros {
  descricao: string;
  quantidade: number;
  /** Padrão `g` para não reinterpretar item já gravado antes das unidades. */
  unidade?: UnidadeEstimada;
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
  const quantidade = Math.max(1, Math.round(entrada.quantidade));
  const unidade = entrada.unidade ?? "g";
  return {
    descricao: `${entrada.descricao} ${quantidade} ${unidade}`,
    calorias: Math.round(entrada.calorias),
    proteinaG: Math.round(entrada.proteinaG),
    carboidratosG: Math.round(entrada.carboidratosG),
    gordurasG: Math.round(entrada.gordurasG),
    fibrasG: Math.round(entrada.fibrasG),
    alimentoId: null,
    quantidade,
    unidade,
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
 *
 * A unidade é **preservada**, nunca normalizada para grama: quem
 * corrige 250 para 350 numa lata de refrigerante está falando dos
 * mesmos mililitros, e reescrever a unidade aqui transformaria uma
 * correção de porção numa conversão silenciosa de volume em massa.
 */
export function reescalarItem(item: ItemPrato, quantidade: number): ItemPrato {
  const alvo = Math.max(1, Math.round(quantidade));
  const fator = alvo / Math.max(1, item.quantidade);
  return {
    ...item,
    descricao: nomeDoItem(item) + sufixoDe({ quantidade: alvo, unidade: item.unidade }),
    quantidade: alvo,
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
 *
 * O nome é gravado como veio, **sem `trim`**. A função é chamada a
 * cada tecla por um campo controlado, então aparar a ponta aqui apaga
 * o espaço no instante em que ele é digitado: "Coca cola zero" chega
 * como "Cocacolazero" e o atleta não consegue escrever nome nenhum
 * com mais de uma palavra. Normalizar é trabalho da fronteira que
 * persiste (`registrarConsumoRealAction`), que já faz isso — não do
 * meio da digitação.
 */
export function renomearItem(item: ItemPrato, nome: string): ItemPrato {
  return { ...item, descricao: `${nome}${sufixoDe(item)}` };
}

/**
 * O nome do item deixou de corresponder aos macros que ele carrega.
 *
 * Renomear preserva os números de propósito — dizer o que era não é
 * dizer quanto era —, mas há correções que mudam o alimento, e não
 * apenas o rótulo: "cola" para "cola zero", "leite" para "leite
 * desnatado", "pão" para "pão integral". Nesses casos os macros
 * antigos descrevem outra comida, e o total mente sem nada na tela
 * dizendo por quê.
 *
 * A função não decide se a diferença importa nutricionalmente — isso
 * exigiria saber de nutrição, que é justamente o que se pede à IA.
 * Ela responde algo verificável: o nome atual ainda é aquele para o
 * qual estes números foram estimados?
 */
export function macrosDesatualizados(item: ItemPrato, nomeEstimado: string): boolean {
  if (item.origemDado !== "estimativa-ia") return false;
  // A comparação normaliza; `nomeDoItem` não, porque alimenta um campo
  // de texto. Um espaço recém-digitado não é uma correção de alimento.
  return nomeDoItem(item).trim().toLowerCase() !== nomeEstimado.trim().toLowerCase();
}

/**
 * Descrição sem o sufixo de gramas que `itemEstimado` acrescenta.
 *
 * **Não apara as pontas**: o retorno alimenta o `value` do campo de
 * correção do alimento, e aparar ali apaga o espaço no keystroke em que
 * ele é digitado — "Coca cola zero" vira "Cocacolazero". Quem precisa
 * comparar normaliza no ponto da comparação.
 */
export function nomeDoItem(item: Pick<ItemPrato, "descricao">): string {
  return item.descricao.replace(SUFIXO_QUANTIDADE, "");
}

/**
 * Remove o sufixo de quantidade de uma descrição solta.
 *
 * Serve a fronteira que reidrata item já persistido, onde só existe a
 * string gravada — sem isto, cada chamador reescreveria o padrão e
 * voltaria a esquecer `ml`.
 */
export function descricaoSemQuantidade(descricao: string): string {
  return descricao.replace(SUFIXO_QUANTIDADE, "");
}

/**
 * Substitui energia e macros de um item mantendo identidade e
 * proveniência.
 *
 * É o retorno da reestimativa por item: o alimento e a quantidade já
 * são os que o atleta corrigiu, o que faltava eram os números. A
 * origem continua `estimativa-ia` porque continua sendo palpite de
 * modelo — mais recente, não mais confiável.
 *
 * A **origem da estimativa** passa a ser `texto`, mesmo num item que
 * nasceu de foto: estes números vieram do nome que o atleta digitou,
 * não da imagem. Sem isso a linha recalculada exibia "alimento e
 * porção claros na foto" sobre uma Coca-Cola Zero que a foto nunca
 * mostrou — a mesma falha de
 * `docs/memory/rotulo-de-confianca-esconde-a-origem.md`, reincidindo
 * pelo recálculo.
 */
export function reestimarMacros(
  item: ItemPrato,
  macros: Macros & { confianca: Confianca; modelo: string },
): ItemPrato {
  return {
    ...item,
    fonte: FONTE_ESTIMATIVA.texto,
    calorias: Math.round(macros.calorias),
    proteinaG: Math.round(macros.proteinaG),
    carboidratosG: Math.round(macros.carboidratosG),
    gordurasG: Math.round(macros.gordurasG),
    fibrasG: Math.round(macros.fibrasG),
    confianca: macros.confianca,
    versaoFonte: macros.modelo,
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
