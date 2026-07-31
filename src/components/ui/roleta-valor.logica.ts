/**
 * Lógica pura da roleta de valores (réguas de altura e peso).
 *
 * A roleta trabalha em duas grandezas distintas e a separação entre elas é o
 * que dá a sensação mecânica da rolagem:
 *
 *   - `posicao`: índice **fracionário** do tique sob a agulha. É contínua e
 *     acompanha o dedo pixel a pixel; é ela quem é desenhada.
 *   - `valor`: leitura discreta derivada de `Math.round(posicao)`. É ela quem
 *     é reportada ao formulário.
 *
 * Manter as duas separadas evita o efeito "salta de 35 em 35 pixels" de um
 * arrasto que arredonda antes de desenhar.
 */

/** Casas decimais implícitas no passo, para domar erro de ponto flutuante. */
function casasDecimais(passo: number) {
  const texto = String(passo);
  const ponto = texto.indexOf(".");
  return ponto === -1 ? 0 : texto.length - ponto - 1;
}

export function arredondarAoPasso(valor: number, passo: number) {
  const fator = 10 ** casasDecimais(passo);
  return Math.round(valor * fator) / fator;
}

export function indiceDoValor(valor: number, minimo: number, passo: number) {
  return (valor - minimo) / passo;
}

export function valorDoIndice(indice: number, minimo: number, passo: number) {
  return arredondarAoPasso(minimo + indice * passo, passo);
}

export function indiceMaximo(minimo: number, maximo: number, passo: number) {
  return Math.round((maximo - minimo) / passo);
}

export function limitarPosicao(posicao: number, indiceMax: number) {
  return Math.min(indiceMax, Math.max(0, posicao));
}

/**
 * Índices visíveis ao redor da agulha, já recortados pelas bordas da escala.
 * Renderizar uma janela — em vez da escala inteira — mantém o DOM pequeno sem
 * que o usuário perceba o limite.
 */
export function janelaDeIndices(posicao: number, raio: number, indiceMax: number) {
  const centro = Math.round(posicao);
  const inicio = Math.max(0, centro - raio);
  const fim = Math.min(indiceMax, centro + raio);
  const indices: number[] = [];
  for (let indice = inicio; indice <= fim; indice += 1) indices.push(indice);
  return indices;
}

/** Velocidade abaixo da qual o fling acabou e o encaixe assume. */
export const VELOCIDADE_MINIMA = 0.0015;
const ATRITO_POR_MS = 0.995;

/**
 * Um passo de integração do fling. `velocidade` está em índices por
 * milissegundo; o atrito é exponencial no tempo para que o resultado não
 * dependa da taxa de quadros da máquina.
 */
export function aplicarInercia(
  posicao: number,
  velocidade: number,
  dtMs: number,
  indiceMax: number,
) {
  const proximaVelocidade = velocidade * ATRITO_POR_MS ** dtMs;
  const proximaPosicao = limitarPosicao(posicao + velocidade * dtMs, indiceMax);
  const bateuNaBorda = proximaPosicao !== posicao + velocidade * dtMs;
  return {
    posicao: proximaPosicao,
    velocidade: bateuNaBorda ? 0 : proximaVelocidade,
    terminou: bateuNaBorda || Math.abs(proximaVelocidade) < VELOCIDADE_MINIMA,
  };
}

/** Curva do encaixe final: rápida no início, assintótica no tique. */
export function suavizarEncaixe(progresso: number) {
  const t = Math.min(1, Math.max(0, progresso));
  return 1 - (1 - t) ** 3;
}

/**
 * Velocidade média das amostras recentes do ponteiro, em índices por ms.
 * A média sobre uma janela curta filtra o tremor do último quadro, que
 * sozinho produz flings erráticos.
 */
export function velocidadeDasAmostras(
  amostras: Array<{ posicao: number; tempo: number }>,
) {
  if (amostras.length < 2) return 0;
  const primeira = amostras[0];
  const ultima = amostras[amostras.length - 1];
  const dt = ultima.tempo - primeira.tempo;
  if (dt <= 0) return 0;
  return (ultima.posicao - primeira.posicao) / dt;
}
