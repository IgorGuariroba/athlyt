import { itemEstimado, type ItemPrato, type OrigemEstimativa } from "@/domain/alimentos/prato";

/**
 * Item bruto devolvido pela operação de IA, antes de virar `ItemPrato`.
 */
export interface ItemEstimadoPelaIa {
  descricao: string;
  quantidade: number;
  unidade?: "g" | "ml";
  calorias: number;
  proteinaG: number;
  carboidratosG: number;
  gordurasG: number;
  fibrasG: number;
  confianca: "alta" | "media" | "baixa";
}

/**
 * Monta os itens do Prato a partir da estimativa da IA, para exibição
 * na tela de revisão.
 *
 * Não é a fronteira de gravação: aqui o item nasce de uma estimativa
 * fresca do servidor, não de um payload reenviado pelo cliente — quem
 * reconstrói o que o cliente devolve depois de revisar é
 * `reconstruirPratoRevisado`. Mora fora do arquivo `"use server"` pelo
 * mesmo motivo que `foto/servico.ts` mora fora do dele: a governança
 * de `src/arquitetura/governanca-prato-revisado.ts` verifica os
 * arquivos de action, não os módulos de domínio que eles chamam.
 */
export function itensDaEstimativa(
  itens: readonly ItemEstimadoPelaIa[],
  modelo: string,
  origemEstimativa: OrigemEstimativa,
): ItemPrato[] {
  return itens.map((item) => itemEstimado({ ...item, modelo, origemEstimativa }));
}
