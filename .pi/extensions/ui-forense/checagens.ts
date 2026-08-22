/**
 * Avaliações determinísticas sobre nós já coletados.
 *
 * Toda função aqui é pura: recebe dados do navegador e devolve
 * evidência numérica. É o que permite ao agente trocar "esse botão
 * parece pequeno" por um número que ou confirma ou derruba a hipótese.
 */

import type { Caixa, EstiloComputado, NoColetado, Viewport } from "./tipos";

/** DESIGN.md > Acessibilidade: "Touch target mínimo 44×44px". */
export const ALVO_DE_TOQUE_MINIMO = 44;

export type ResultadoAlvoDeToque = {
  conforme: boolean;
  largura: number;
  altura: number;
  minimo: number;
  /** A área veio do ancestral clicável, não da caixa visual do nó. */
  alvoHerdado?: boolean;
};

/**
 * Mede a área de toque real.
 *
 * O ancestral clicável tem precedência sobre a caixa visual porque o
 * falso positivo clássico é justamente esse: um `svg` de 24×24 dentro
 * de um `button` de 48×48 parece pequeno na captura e está correto no
 * dispositivo. Medir só o que se vê produziria um achado falso.
 */
export function avaliarAlvoDeToque(
  no: NoColetado,
  ancestralClicavel?: { caixa: Caixa },
): ResultadoAlvoDeToque {
  const alvo = ancestralClicavel?.caixa ?? no.caixa;
  const conforme =
    alvo.largura >= ALVO_DE_TOQUE_MINIMO && alvo.altura >= ALVO_DE_TOQUE_MINIMO;

  return {
    conforme,
    largura: alvo.largura,
    altura: alvo.altura,
    minimo: ALVO_DE_TOQUE_MINIMO,
    ...(ancestralClicavel ? { alvoHerdado: true } : {}),
  };
}

export type ResultadoOverflow =
  | { transborda: false }
  | { transborda: true; lado: "esquerda" | "direita"; excedente: number };

/**
 * Só o eixo horizontal.
 *
 * Rolagem vertical é como se lê qualquer tela do produto; acusá-la
 * afogaria a varredura em ruído. Transbordo lateral, em mobile, é
 * sempre defeito: some conteúdo ou nasce uma barra de rolagem que a
 * composição não previu.
 */
export function avaliarOverflow(no: NoColetado, viewport: Viewport): ResultadoOverflow {
  const direita = no.caixa.x + no.caixa.largura;
  if (no.caixa.x < 0) {
    return { transborda: true, lado: "esquerda", excedente: Math.round(-no.caixa.x) };
  }
  if (direita > viewport.largura) {
    return {
      transborda: true,
      lado: "direita",
      excedente: Math.round(direita - viewport.largura),
    };
  }
  return { transborda: false };
}

export type AmostraDeHitTest = {
  /** `[x, y]` em coordenadas de viewport. */
  ponto: [number, number];
  /** Seletor do nó que `elementFromPoint` devolveu. */
  atingido: string;
};

export type ResultadoOclusao = {
  obstruido: boolean;
  obstrutores: string[];
  pontosLivres: number;
  pontosAmostrados: number;
};

/**
 * Compara o que se esperava atingir com o que o navegador atingiu.
 *
 * Descendente conta como acerto: clicar num botão quase sempre resolve
 * para o `span` de dentro, e tratar isso como obstrução transformaria
 * a checagem num gerador de falso positivo — exatamente o defeito que
 * ela deveria detectar em quem a lê.
 */
export function avaliarOclusao(entrada: {
  esperado: string;
  amostras: AmostraDeHitTest[];
}): ResultadoOclusao {
  const obstrutores = new Set<string>();
  let livres = 0;

  for (const amostra of entrada.amostras) {
    const proprio =
      amostra.atingido === entrada.esperado ||
      amostra.atingido.startsWith(`${entrada.esperado} `) ||
      amostra.atingido.startsWith(`${entrada.esperado}>`);
    if (proprio) livres += 1;
    else obstrutores.add(amostra.atingido);
  }

  return {
    obstruido: obstrutores.size > 0,
    obstrutores: [...obstrutores],
    pontosLivres: livres,
    pontosAmostrados: entrada.amostras.length,
  };
}

export type ResultadoFoco = { focavel: boolean; focoVisivel: boolean };

function assinaturaDeFoco(estilo: EstiloComputado): string {
  const semAnel = (valor?: string) => !valor || valor === "none" || valor === "0px";
  return [
    semAnel(estilo.outlineStyle) ? "" : estilo.outlineStyle,
    semAnel(estilo.outlineWidth) ? "" : estilo.outlineWidth,
    // O anel do kit é `box-shadow` (utilitária `ring` do Tailwind, e
    // `outline-ring/50` em globals.css): exigir `outline` reprovaria
    // todo componente conforme.
    semAnel(estilo.boxShadow) ? "" : estilo.boxShadow,
  ].join("|");
}

export function avaliarFoco(entrada: {
  focavel: boolean;
  antes: EstiloComputado;
  depois: EstiloComputado;
}): ResultadoFoco {
  if (!entrada.focavel) return { focavel: false, focoVisivel: false };

  const antes = assinaturaDeFoco(entrada.antes);
  const depois = assinaturaDeFoco(entrada.depois);
  return {
    focavel: true,
    focoVisivel: depois !== antes && depois !== "||",
  };
}
