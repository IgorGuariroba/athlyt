import sharp from "sharp";

export const LIMITE_FOTO_CORPORAL_BYTES = 10 * 1024 * 1024;
export const TIPOS_FOTO_CORPORAL = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function prepararFotoCorporal(entrada: { bytes: Uint8Array; contentType: string }) {
  if (!TIPOS_FOTO_CORPORAL.has(entrada.contentType)) throw new Error("Formato de foto não permitido.");
  if (entrada.bytes.byteLength > LIMITE_FOTO_CORPORAL_BYTES) throw new Error("Foto excede o limite de 10 MB.");
  const corpo = await sharp(entrada.bytes)
    .rotate()
    .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  return { corpo, contentType: "image/webp" as const };
}
