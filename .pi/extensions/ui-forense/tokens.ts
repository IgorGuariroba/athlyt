/**
 * Desvio de design system medido no pixel renderizado.
 *
 * A governança de `write` (extensão `ui-componentes`) é estática: pega
 * cor literal e utilitária crua no texto do arquivo. Ela não vê o que
 * o navegador de fato pintou — um `text-[15px]` sobrevivendo dentro de
 * um componente, uma classe herdada, um estilo inline vindo de props.
 * Esta checagem fecha essa lacuna comparando o estilo computado com a
 * escala declarada em `src/app/globals.css`.
 *
 * A escala é lida do CSS, nunca duplicada aqui: uma cópia à mão
 * envelheceria e passaria a reprovar exatamente o valor correto.
 */

import type { NoColetado } from "./tipos";

export type TokenDeEscala = { token: string; valor: number };

export type EscalaDeTokens = {
  fontSize: TokenDeEscala[];
  borderRadius: TokenDeEscala[];
};

export type ViolacaoDeToken = {
  propriedade: string;
  computado: number;
  tokenMaisProximo: string | null;
  esperado: number | null;
};

/** `16px` → 16; `0.375rem` → 6. Devolve `null` para `auto`, `%`, `calc()`. */
function emPixels(bruto: string): number | null {
  const texto = bruto.trim();
  const px = /^(-?[\d.]+)px$/.exec(texto);
  if (px) return Number(px[1]);
  const rem = /^(-?[\d.]+)rem$/.exec(texto);
  if (rem) return Number(rem[1]) * 16;
  return null;
}

/**
 * Só as declarações literais interessam: um token definido como
 * `calc(var(--radius) + 6px)` depende de outro e seria resolvido
 * errado por leitura textual. O navegador já entrega o valor final no
 * estilo computado, então o risco de perder um token derivado é aceito
 * em troca de não inventar um esperado falso.
 */
export function lerEscalaDeTokens(css: string): EscalaDeTokens {
  const fontSize: TokenDeEscala[] = [];
  const borderRadius: TokenDeEscala[] = [];

  const declaracao = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  for (const [, token, bruto] of css.matchAll(declaracao)) {
    const valor = emPixels(bruto);
    if (valor === null) continue;

    // `--text-body-md--line-height` é modificador do token, não um
    // tamanho da escala; incluí-lo faria 20px passar como font-size.
    const ehModificador = token.slice(2).includes("--");
    if (ehModificador) continue;

    if (token.startsWith("--text-")) fontSize.push({ token, valor });
    if (token === "--radius" || token.startsWith("--radius-")) {
      borderRadius.push({ token, valor });
    }
  }

  return { fontSize, borderRadius };
}

function maisProximo(valor: number, escala: TokenDeEscala[]): TokenDeEscala | null {
  let melhor: TokenDeEscala | null = null;
  for (const candidato of escala) {
    if (!melhor || Math.abs(candidato.valor - valor) < Math.abs(melhor.valor - valor)) {
      melhor = candidato;
    }
  }
  return melhor;
}

function conferir(
  propriedade: string,
  bruto: string | undefined,
  escala: TokenDeEscala[],
): ViolacaoDeToken | null {
  if (!bruto || escala.length === 0) return null;
  const computado = emPixels(bruto);
  if (computado === null) return null;
  if (escala.some((item) => item.valor === computado)) return null;

  const vizinho = maisProximo(computado, escala);
  return {
    propriedade,
    computado,
    tokenMaisProximo: vizinho?.token ?? null,
    esperado: vizinho?.valor ?? null,
  };
}

export function avaliarTokens(no: NoColetado, escala: EscalaDeTokens): ViolacaoDeToken[] {
  return [
    conferir("font-size", no.estilo.fontSize, escala.fontSize),
    conferir("border-radius", no.estilo.borderRadius, escala.borderRadius),
  ].filter((violacao): violacao is ViolacaoDeToken => violacao !== null);
}
