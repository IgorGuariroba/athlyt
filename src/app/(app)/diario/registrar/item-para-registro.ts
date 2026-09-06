import {
  encontrarAlimento,
  macrosPorQuantidadeNutricional,
} from "@/domain/alimentos/base";
import {
  descricaoSemQuantidade,
  itemEstimado,
  itemManual,
  origemDaEstimativa,
  type ItemPrato,
  type OrigemEstimativa,
  type UnidadeEstimada,
} from "@/domain/alimentos/prato";

/**
 * Reconstrói um item vindo do cliente sem apagar sua proveniência.
 *
 * Um item que declara origem de base é recalculado pela própria base;
 * o cliente não escolhe os números nem consegue promover um palpite a
 * valor de tabela. Itens de IA e do usuário preservam suas origens,
 * mas continuam limitados pelas faixas aceitas na persistência.
 */
export function reconstruirItemParaRegistro(
  bruto: ItemPrato,
  origemPadrao: OrigemEstimativa,
): ItemPrato {
  const quantidade = bruto.quantidade;
  const unidade: UnidadeEstimada = bruto.unidade === "ml" ? "ml" : "g";
  if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 3000) {
    throw new Error(`Quantidade fora do intervalo aceito (1 a 3000 ${unidade}).`);
  }
  const nome = descricaoSemQuantidade(bruto.descricao).trim();
  if (nome.length === 0) throw new Error("Todo item precisa de uma descrição.");

  if (bruto.origemDado === "base" && bruto.alimentoId) {
    const alimento = encontrarAlimento(bruto.alimentoId);
    const macros = alimento
      ? macrosPorQuantidadeNutricional(alimento, quantidade, unidade)
      : null;
    if (!alimento || !macros) {
      throw new Error(`Não consegui validar ${nome} na base nutricional.`);
    }
    return {
      descricao: `${nome} ${Math.round(quantidade)} ${unidade}`,
      ...macros,
      alimentoId: alimento.id,
      quantidade: Math.round(quantidade),
      unidade,
      origemDado: "base",
      fonte: alimento.proveniencia.fonte,
      versaoFonte: `${alimento.proveniencia.versao} (${alimento.proveniencia.atualizadaEm})`,
      confianca: alimento.confianca,
    };
  }

  if (bruto.origemDado === "usuario") {
    return itemManual({
      nome,
      quantidade,
      unidade,
      calorias: numero(bruto.calorias, 5000),
      proteinaG: numero(bruto.proteinaG, 400),
      carboidratosG: numero(bruto.carboidratosG, 700),
      gordurasG: numero(bruto.gordurasG, 400),
      fibrasG: numero(bruto.fibrasG, 100),
    });
  }

  return itemEstimado({
    descricao: nome,
    quantidade,
    unidade,
    calorias: numero(bruto.calorias, 5000),
    proteinaG: numero(bruto.proteinaG, 400),
    carboidratosG: numero(bruto.carboidratosG, 700),
    gordurasG: numero(bruto.gordurasG, 400),
    fibrasG: numero(bruto.fibrasG, 100),
    confianca: bruto.confianca,
    modelo: bruto.versaoFonte,
    origemEstimativa: origemDaEstimativa(bruto, origemPadrao),
  });
}

function numero(valor: unknown, teto: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, teto);
}
