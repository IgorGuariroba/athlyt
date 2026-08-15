import sharp from "sharp";

/**
 * Preparo da foto do prato antes de ir ao provedor de IA.
 *
 * Não reusa `prepararFotoCorporal` de propósito: aquela foto é
 * armazenada no R2 para comparação longitudinal e precisa de
 * resolução alta; esta é **efêmera** — existe apenas durante a
 * estimativa e nunca é persistida. O que ela precisa é caber no
 * corpo de uma Server Action e ser legível pelo modelo, e 1024px
 * bastam para identificar alimentos e volume no prato.
 *
 * A regravação em WebP também remove metadados (EXIF, GPS): a foto
 * de um almoço costuma carregar a localização de quem comeu, e nada
 * disso é pertinente à estimativa de macros.
 */

export const LIMITE_FOTO_REFEICAO_BYTES = 10 * 1024 * 1024;
export const TIPOS_FOTO_REFEICAO = new Set(["image/jpeg", "image/png", "image/webp"]);

const LADO_MAXIMO = 1024;

export async function prepararFotoRefeicao(entrada: {
  bytes: Uint8Array;
  contentType: string;
}): Promise<{ corpo: Buffer; contentType: "image/webp" }> {
  if (!TIPOS_FOTO_REFEICAO.has(entrada.contentType)) {
    throw new Error("Formato de foto não permitido. Use JPEG, PNG ou WebP.");
  }
  if (entrada.bytes.byteLength > LIMITE_FOTO_REFEICAO_BYTES) {
    throw new Error("Foto excede o limite de 10 MB.");
  }
  const corpo = await sharp(entrada.bytes)
    .rotate()
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return { corpo, contentType: "image/webp" };
}
