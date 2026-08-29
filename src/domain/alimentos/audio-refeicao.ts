/**
 * Áudio da descrição da refeição, antes de ir ao provedor de IA.
 *
 * Diferente da foto do prato, o áudio **não é reprocessado**: não há
 * transcodificação porque nenhuma decisão do fluxo depende do formato
 * — o modelo recebe o container que o navegador gravou. O que existe
 * aqui é a fronteira: formato permitido e teto de tamanho, validados
 * no servidor antes de qualquer chamada externa.
 *
 * Os bytes são efêmeros por decisão de produto (ADR 0002): existem
 * durante a transcrição e são descartados. O que sobrevive é a
 * transcrição revisada pelo atleta, não a gravação.
 */

export const LIMITE_AUDIO_REFEICAO_BYTES = 8 * 1024 * 1024;

/** Um minuto de fala descrevendo um prato cabe folgado em qualquer um destes. */
export const TIPOS_AUDIO_REFEICAO = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

export function validarAudioRefeicao(entrada: {
  bytes: Uint8Array;
  contentType: string;
}): { dados: Uint8Array; mediaType: string } {
  // O navegador anexa codec ao tipo ("audio/webm;codecs=opus"); a
  // decisão é sobre o container, então o parâmetro é descartado antes
  // da comparação em vez de multiplicar entradas na lista.
  const mediaType = entrada.contentType.split(";")[0].trim().toLowerCase();
  if (!TIPOS_AUDIO_REFEICAO.has(mediaType)) {
    throw new Error("Formato de áudio não permitido. Grave de novo ou escreva a descrição.");
  }
  if (entrada.bytes.byteLength === 0) {
    throw new Error("O áudio chegou vazio. Grave de novo ou escreva a descrição.");
  }
  if (entrada.bytes.byteLength > LIMITE_AUDIO_REFEICAO_BYTES) {
    throw new Error("Áudio muito longo. Grave uma descrição mais curta ou escreva o que comeu.");
  }
  return { dados: entrada.bytes, mediaType };
}

/**
 * Limites da descrição, escritos ou transcritos.
 *
 * O teto não é defesa contra abuso apenas: uma descrição de dois mil
 * caracteres deixou de ser a memória de uma refeição e vira texto que
 * o modelo vai resumir por conta própria, inventando o que faltar.
 */
export const LIMITE_DESCRICAO = 1000;
export const MINIMO_DESCRICAO = 3;

export function validarDescricaoRefeicao(bruto: string): string {
  const descricao = bruto.trim().replace(/\s+/g, " ");
  if (descricao.length < MINIMO_DESCRICAO) {
    throw new Error("Descreva o que você comeu, ao menos em poucas palavras.");
  }
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(
      `Descrição longa demais (${descricao.length} caracteres). Resuma em até ${LIMITE_DESCRICAO}.`,
    );
  }
  return descricao;
}
