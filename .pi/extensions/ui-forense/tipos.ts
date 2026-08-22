/**
 * Vocabulário compartilhado entre a coleta (que roda dentro do
 * navegador e só devolve dados) e as avaliações (que rodam em Node e
 * concentram todo o julgamento).
 *
 * A separação existe para que a parte que decide se algo é um defeito
 * seja testável sem subir Chromium: `NoColetado` é a fronteira, e tudo
 * a jusante dela é função pura.
 */

export type Caixa = {
  x: number;
  y: number;
  largura: number;
  altura: number;
};

export type Viewport = {
  largura: number;
  altura: number;
};

/**
 * Estilo computado, já reduzido ao subconjunto que alguma checagem
 * consome. Strings cruas do `getComputedStyle` (`"16px"`, `"rgb(...)"`)
 * porque normalizar é trabalho das avaliações, não da coleta.
 */
export type EstiloComputado = {
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  outlineStyle?: string;
  outlineWidth?: string;
  boxShadow?: string;
  zIndex?: string;
  position?: string;
};

/** Um elemento como o navegador o entregou, antes de qualquer juízo. */
export type NoColetado = {
  papel: string;
  nome: string;
  tag: string;
  /** Seletor estável o suficiente para reencontrar o nó na página. */
  seletor: string;
  caixa: Caixa;
  estilo: EstiloComputado;
  visivel: boolean;
  desabilitado?: boolean;
  tabIndex?: number;
  /** `data-testid`, quando existe — o caminho preferido de interação. */
  testid?: string;
  /** Origem React (`arquivo:linha`), quando a instrumentação de dev expõe. */
  origem?: string;
};

/** Nó com identidade estável dentro de uma observação. */
export type ElementoInventariado = NoColetado & { id: string };
