import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepararFotoCorporal } from "../fotos";

describe("preparação privada de fotos corporais", () => {
  it("normaliza orientação, converte para WebP e remove metadados", async () => {
    const entrada = await sharp({ create: { width: 600, height: 900, channels: 3, background: "#456789" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const saida = await prepararFotoCorporal({ bytes: entrada, contentType: "image/jpeg" });
    const metadata = await sharp(saida.corpo).metadata();
    expect(saida.contentType).toBe("image/webp");
    expect(metadata).toMatchObject({ format: "webp", width: 900, height: 600 });
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("rejeita formato não permitido antes do upload", async () => {
    await expect(prepararFotoCorporal({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/svg+xml" })).rejects.toThrow(/Formato/);
  });
});
