/**
 * Governança da reconstrução do Prato revisado.
 *
 * A decisão de "como um item cru vira item persistido" tem um dono:
 * `src/domain/alimentos/prato-revisado.ts`. Esta governança impede que
 * ela volte a ser reimplementada numa server action — que é a forma
 * que produziu o defeito da issue #203: um portão inline reescrevia a
 * origem da estimativa, duplicava o sufixo de quantidade e não
 * validava faixa nenhuma.
 *
 * Regra verificável sobre a fonte: nenhum arquivo `"use server"`
 * chama `itemEstimado`, `itemManual` ou `itemDeAlimento` direto. Ele
 * declara o Prato revisado e a origem da tela; quem constrói o item é
 * o portão.
 *
 * O conjunto de exceções nasce vazio e só encolhe, como
 * `ACTIONS_COM_INVALIDACAO_LITERAL` em `governanca-invalidacao.ts`.
 */

/** Arquivos `"use server"` que ainda constroem `ItemPrato` por conta própria. */
export const ACTIONS_COM_CONSTRUCAO_LITERAL = new Set<string>([]);

const CONSTRUTORES_DE_ITEM = ["itemEstimado", "itemManual", "itemDeAlimento"];

export function ehArquivoDeServerAction(fonte: string): boolean {
  return /^\s*["']use server["']/.test(fonte);
}

/** Server actions que ainda constroem `ItemPrato` chamando os construtores direto. */
export function actionsComConstrucaoLiteralDeItem(
  arquivos: readonly { caminho: string; fonte: string }[],
): string[] {
  return arquivos
    .filter(({ fonte }) => ehArquivoDeServerAction(fonte))
    .filter(({ caminho }) => !ACTIONS_COM_CONSTRUCAO_LITERAL.has(caminho))
    .filter(({ fonte }) => CONSTRUTORES_DE_ITEM.some((nome) => fonte.includes(`${nome}(`)))
    .map(
      ({ caminho }) =>
        `${caminho} constrói ItemPrato direto: declare o Prato revisado e a origem com reconstruirPratoRevisado`,
    );
}
