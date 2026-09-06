import { revalidatePath } from "next/cache";

import { rotasParaInvalidar, type FatoMudado } from "./mapa";

export type { FatoMudado } from "./mapa";

/**
 * Declara o que a escrita mudou; o mapa decide quais telas passaram a
 * mostrar dado velho.
 *
 * A action nomeia o fato que produziu — a única coisa que ela de fato
 * sabe — e, quando vai redirecionar, para onde vai. O destino entra por
 * aqui de propósito: é o que garante, pela interface, a regra que
 * docs/memory/service-worker-serve-rsc-velho-apos-server-action.md
 * escreveu em prosa e que 14 autores precisavam lembrar. Em Server
 * Actions, cada chamada também purga o Router Cache inteiro do cliente;
 * `rota`/`alcance` não limitam essa purga ao caminho informado. Eles
 * continuam relevantes para o Full Route Cache quando uma leitura deixar
 * de ser dinâmica.
 *
 * ```ts
 * invalidarLeituras([{ fato: "sessao", sessaoId }], { destino: `/sessao/${sessaoId}/resumo` });
 * redirect(`/sessao/${sessaoId}/resumo`);
 * ```
 */
export function invalidarLeituras(
  fatos: readonly FatoMudado[],
  opcoes?: { destino?: string },
): void {
  for (const { rota, alcance } of rotasParaInvalidar(fatos, opcoes)) {
    revalidatePath(rota, alcance);
  }
}
