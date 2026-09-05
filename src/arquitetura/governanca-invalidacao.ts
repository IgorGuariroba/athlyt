/**
 * Governança da invalidação de leitura.
 *
 * A decisão de "quais telas passaram a mostrar dado velho" tem um dono:
 * `src/app/_invalidacao`. Esta governança impede que ela volte a ser
 * redescoberta em cada server action — que é a forma que produziu o
 * defeito registrado em
 * docs/memory/service-worker-serve-rsc-velho-apos-server-action.md.
 *
 * Duas regras, ambas verificáveis sobre a fonte:
 *
 * 1. Nenhum arquivo `"use server"` chama `revalidatePath` direto.
 * 2. Uma action que invalida e depois redireciona informa o `destino` —
 *    o caso em que a action revalidava uma rota e navegava para outra.
 */

/** Arquivos `"use server"` que ainda chamam `revalidatePath` direto. */
export const ACTIONS_COM_INVALIDACAO_LITERAL = new Set<string>([]);

/** Fim do arquivo serve de fronteira para a última função. */
const DECLARACAO_DE_ACTION = /export\s+async\s+function\s+([A-Za-z0-9_]+)/g;

/** Corpo de cada função exportada, delimitado pela declaração seguinte. */
function corposDasActions(fonte: string): { nome: string; corpo: string }[] {
  const inicios = [...fonte.matchAll(DECLARACAO_DE_ACTION)].map((m) => ({
    nome: m[1],
    indice: m.index,
  }));
  return inicios.map(({ nome, indice }, posicao) => ({
    nome,
    corpo: fonte.slice(indice, inicios[posicao + 1]?.indice ?? fonte.length),
  }));
}

export function ehArquivoDeServerAction(fonte: string): boolean {
  return /^\s*["']use server["']/.test(fonte);
}

/**
 * Actions que invalidam e, em seguida, navegam — sem dizer para onde.
 *
 * O `redirect` de guarda (`if (!session) redirect("/")`) acontece antes
 * de qualquer escrita, e por isso só conta o que vem depois da
 * invalidação.
 */
export function actionsSemDestinoDeclarado(
  arquivos: readonly { caminho: string; fonte: string }[],
): string[] {
  return arquivos
    .filter(({ fonte }) => ehArquivoDeServerAction(fonte))
    .flatMap(({ caminho, fonte }) =>
      corposDasActions(fonte)
        .filter(({ corpo }) => {
          const invalidacao = corpo.indexOf("invalidarLeituras(");
          if (invalidacao === -1) return false;
          if (corpo.includes("destino")) return false;
          return corpo.includes("redirect(", invalidacao);
        })
        .map(
          ({ nome }) =>
            `${caminho}: ${nome} redireciona depois de invalidar sem informar destino a invalidarLeituras`,
        ),
    );
}

/** Server actions que ainda decidem sozinhas quais rotas invalidar. */
export function actionsComInvalidacaoLiteral(
  arquivos: readonly { caminho: string; fonte: string }[],
): string[] {
  return arquivos
    .filter(({ fonte }) => ehArquivoDeServerAction(fonte))
    .filter(({ caminho }) => !ACTIONS_COM_INVALIDACAO_LITERAL.has(caminho))
    .filter(({ fonte }) => fonte.includes("revalidatePath"))
    .map(
      ({ caminho }) =>
        `${caminho} chama revalidatePath direto: declare o fato mudado com invalidarLeituras`,
    );
}
