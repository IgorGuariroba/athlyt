/**
 * Portão único de reconstrução do Prato revisado.
 *
 * Foto, descrição, áudio e Atalhos/Manual convergem na mesma tela de
 * revisão (`RevisaoEstimativa` / `useRevisaoEstimativa`) e terminam na
 * mesma escrita (`registrarConsumoReal`). Entre o payload que o
 * cliente manda e o item persistido só existe este módulo: nenhuma
 * action monta `ItemPrato` por conta própria (ver
 * `src/arquitetura/governanca-prato-revisado.ts`).
 *
 * Isso corrige um defeito real, não hipotético: o portão inline que
 * existia em `diario/actions.ts` reescrevia a origem de todo item
 * estimado para "foto" (o default de `itemEstimado`), duplicava o
 * sufixo de quantidade em item manual e não validava faixa nenhuma —
 * enquanto o portão que hoje vive aqui já fazia as três coisas certas
 * para o outro chamador. Ver issue #203.
 */

import {
  descricaoSemQuantidade,
  itemDeAlimento,
  itemEstimado,
  itemManual,
  origemDaEstimativa,
  type ItemPrato,
  type OrigemEstimativa,
  type UnidadeEstimada,
} from "./prato";

const TETOS_MACROS = {
  calorias: 5000,
  proteinaG: 400,
  carboidratosG: 700,
  gordurasG: 400,
  fibrasG: 100,
} as const;

function numeroDentroDaFaixa(valor: unknown, teto: number, campo: string): number {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > teto) {
    throw new Error(`${campo} fora do intervalo aceito (0 a ${teto}).`);
  }
  return n;
}

function reconstruirItem(bruto: ItemPrato, origemDaTela: OrigemEstimativa): ItemPrato {
  if (typeof bruto !== "object" || typeof bruto.descricao !== "string") {
    throw new Error("Todo item precisa de uma descrição.");
  }
  const quantidade = bruto.quantidade;
  if (!Number.isFinite(quantidade) || quantidade < 1 || quantidade > 3000) {
    // A unidade só é g/ml para IA e base; o item manual aceita
    // porção livre ("porção", "marmita") e o erro não pode fingir uma
    // unidade que o item nem carrega.
    const rotulo = bruto.unidade === "ml" || bruto.unidade === "g" ? bruto.unidade : "g";
    throw new Error(`Quantidade fora do intervalo aceito (1 a 3000 ${rotulo}).`);
  }
  const nome = descricaoSemQuantidade(bruto.descricao).trim();
  if (nome.length === 0) throw new Error("Todo item precisa de uma descrição.");
  if (!( ["base", "usuario", "estimativa-ia"] as const).includes(bruto.origemDado)) {
    throw new Error("Origem do item inválida.");
  }

  if (bruto.origemDado === "base") {
    if (typeof bruto.alimentoId !== "string" || bruto.alimentoId.length === 0) {
      throw new Error(`Não consegui validar ${nome} na base nutricional.`);
    }
    // A unidade de um item de base não é sempre g/ml: os Atalhos
    // deixam escolher porção caseira ("escumadeira", "unidade média").
    // `itemDeAlimento` já sabe resolver qualquer porção do alimento e
    // reconstrói a descrição a partir do nome da base, não do que o
    // cliente mandou — o cliente não escolhe os números.
    try {
      return itemDeAlimento(bruto.alimentoId, { quantidade, unidade: bruto.unidade });
    } catch {
      throw new Error(`Não consegui validar ${nome} na base nutricional.`);
    }
  }

  if (bruto.origemDado === "usuario") {
    // Unidade livre, preservada como o atleta digitou ("porção",
    // "marmita"): normalizá-la para g/ml aqui reintroduziria o mesmo
    // sufixo duplicado que a issue #203 corrigiu do outro lado.
    return itemManual({
      nome,
      quantidade,
      unidade: bruto.unidade,
      calorias: numeroDentroDaFaixa(bruto.calorias, TETOS_MACROS.calorias, "Calorias"),
      proteinaG: numeroDentroDaFaixa(bruto.proteinaG, TETOS_MACROS.proteinaG, "Proteína"),
      carboidratosG: numeroDentroDaFaixa(bruto.carboidratosG, TETOS_MACROS.carboidratosG, "Carboidratos"),
      gordurasG: numeroDentroDaFaixa(bruto.gordurasG, TETOS_MACROS.gordurasG, "Gorduras"),
      fibrasG: numeroDentroDaFaixa(bruto.fibrasG, TETOS_MACROS.fibrasG, "Fibras"),
    });
  }

  const unidade: UnidadeEstimada = bruto.unidade === "ml" ? "ml" : "g";
  return itemEstimado({
    descricao: nome,
    quantidade,
    unidade,
    calorias: numeroDentroDaFaixa(bruto.calorias, TETOS_MACROS.calorias, "Calorias"),
    proteinaG: numeroDentroDaFaixa(bruto.proteinaG, TETOS_MACROS.proteinaG, "Proteína"),
    carboidratosG: numeroDentroDaFaixa(bruto.carboidratosG, TETOS_MACROS.carboidratosG, "Carboidratos"),
    gordurasG: numeroDentroDaFaixa(bruto.gordurasG, TETOS_MACROS.gordurasG, "Gorduras"),
    fibrasG: numeroDentroDaFaixa(bruto.fibrasG, TETOS_MACROS.fibrasG, "Fibras"),
    confianca: bruto.confianca,
    modelo: bruto.versaoFonte,
    origemEstimativa: origemDaEstimativa(bruto, origemDaTela),
  });
}

/**
 * Reconstrói o Prato revisado inteiro a partir do payload cru do
 * cliente.
 *
 * O chamador só precisa saber duas coisas: o array cru e de qual tela
 * ele veio. Não precisa conhecer `itemEstimado`, `itemManual`,
 * `itemDeAlimento`, `descricaoSemQuantidade` nem `origemDaEstimativa`,
 * nem a ordem de combiná-los — e não tem como esquecer um item, porque
 * a interface é o array, não o item.
 *
 * Item que declara origem de base é recalculado pela base nutricional
 * (o cliente não escolhe os números nem promove palpite a valor de
 * tabela e é recusado quando o `alimentoId` é desconhecido). Item
 * estimado conserva a origem que já carregava e só cai na origem da
 * tela quando não carregava nenhuma. Item do usuário tem a descrição
 * aparada antes de virar nome, para que o sufixo de quantidade não se
 * acumule. Quantidade fora de 1–3000 e macros acima dos tetos são
 * recusados, com mensagem endereçada ao atleta.
 *
 * Um array vazio é erro, não Prato vazio: nenhuma refeição existe sem
 * itens.
 */
export function reconstruirPratoRevisado(
  itensBrutos: readonly ItemPrato[],
  origemDaTela: OrigemEstimativa,
): ItemPrato[] {
  if (itensBrutos.length === 0) {
    throw new Error("Um registro precisa de ao menos um item no Prato.");
  }
  return itensBrutos.map((bruto) => reconstruirItem(bruto, origemDaTela));
}
