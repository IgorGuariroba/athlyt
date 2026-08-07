import type { LadoCorporal, RegiaoCorporal } from "./index";

/**
 * Catálogo das regiões coletáveis, indexado pelo identificador usado
 * nos formulários.
 *
 * Existe para que o autosave por região possa validar o identificador
 * recebido do cliente: sem catálogo, uma Server Action que aceita
 * `regiao`/`lado` livres deixaria o cliente gravar combinações que a
 * UI nunca oferece.
 */

export interface ItemMedida {
  regiao: RegiaoCorporal;
  lado?: LadoCorporal;
  prefixo: string;
}

export const ESSENCIAIS = [
  { regiao: "cintura", prefixo: "cintura" },
  { regiao: "pescoco", prefixo: "pescoco" },
  { regiao: "quadril", prefixo: "quadril" },
] as const satisfies readonly ItemMedida[];

export const COMPLETAS = [
  { regiao: "torax", prefixo: "torax" },
  { regiao: "ombros", prefixo: "ombros" },
  { regiao: "braco", lado: "direito", prefixo: "bracoD" },
  { regiao: "braco", lado: "esquerdo", prefixo: "bracoE" },
  { regiao: "coxa", lado: "direito", prefixo: "coxaD" },
  { regiao: "coxa", lado: "esquerdo", prefixo: "coxaE" },
  { regiao: "panturrilha", lado: "direito", prefixo: "panturrilhaD" },
  { regiao: "panturrilha", lado: "esquerdo", prefixo: "panturrilhaE" },
  { regiao: "punho", prefixo: "punho" },
  { regiao: "tornozelo", prefixo: "tornozelo" },
] as const satisfies readonly ItemMedida[];

const POR_PREFIXO = new Map<string, ItemMedida>(
  [...ESSENCIAIS, ...COMPLETAS].map((item) => [item.prefixo, item]),
);

/** Resolve um identificador de formulário, ou `undefined` se não existir. */
export function medidaPorPrefixo(prefixo: string): ItemMedida | undefined {
  return POR_PREFIXO.get(prefixo);
}

/** Chave `regiao:lado` usada para repor valores já gravados. */
export function chaveDe(item: ItemMedida): string {
  return `${item.regiao}:${item.lado ?? "unico"}`;
}
