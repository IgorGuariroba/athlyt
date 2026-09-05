/**
 * Redução de imagem no navegador antes de qualquer Server Action.
 *
 * Fotos de celular chegam com 3 a 8 MB. Server Actions recusam corpos
 * acima de `experimental.serverActions.bodySizeLimit` com um 413 que
 * nunca chega à action: a tela não mostra erro e o toque parece não
 * fazer nada. Reduzir aqui mantém o corpo pequeno independentemente da
 * câmera do aparelho, e o limite do servidor vira rede de segurança.
 *
 * A conversão é só de transporte: o recorte canônico continua no
 * servidor (`prepararFotoCorporal`, `prepararFotoRefeicao`), que remove
 * metadados e regrava. O cliente não é fonte de confiança.
 *
 * `imageOrientation: "from-image"` aplica o EXIF antes do desenho: sem
 * isso, uma foto de retrato tirada na horizontal chegaria deitada ao
 * servidor, que já removeu o metadado e não teria como corrigir.
 */
export async function reduzirImagemParaEnvio(
  arquivo: File,
  { ladoMaximo = 1600, qualidade = 0.85 }: { ladoMaximo?: number; qualidade?: number } = {},
): Promise<File> {
  if (typeof createImageBitmap !== "function") return arquivo;

  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) return arquivo;
    contexto.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", qualidade);
    });
    if (!blob || blob.size >= arquivo.size) return arquivo;

    return new File([blob], `${arquivo.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
    });
  } catch {
    // Navegador sem suporte a WebP no canvas ou arquivo ilegível: o
    // original ainda pode caber, e o servidor continua validando.
    return arquivo;
  }
}
