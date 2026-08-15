import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepararFotoRefeicao } from "../foto-refeicao";
import { itemEstimado, reescalarItem, subtotalDoPrato } from "../prato";

describe("preparo da foto do prato", () => {
  it("aplica orientação, reduz e regrava em WebP sem metadados", async () => {
    const entrada = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#334455" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const saida = await prepararFotoRefeicao({ bytes: entrada, contentType: "image/jpeg" });
    const metadata = await sharp(saida.corpo).metadata();

    expect(saida.contentType).toBe("image/webp");
    // Orientação 6 gira 90°: o lado maior passa a ser a altura.
    expect(Math.max(metadata.width!, metadata.height!)).toBe(1024);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejeita formato não permitido antes de chegar ao provedor", async () => {
    await expect(
      prepararFotoRefeicao({ bytes: new Uint8Array([1, 2, 3]), contentType: "application/pdf" }),
    ).rejects.toThrow(/Formato/);
  });
});

describe("item estimado por foto", () => {
  const item = itemEstimado({
    descricao: "Arroz branco",
    quantidadeGramas: 150,
    calorias: 192,
    proteinaG: 3,
    carboidratosG: 42,
    gordurasG: 0,
    fibrasG: 2,
    confianca: "media",
    modelo: "google/gemini-2.5-flash-lite",
  });

  it("declara origem de IA e guarda o modelo, para o registro continuar auditável", () => {
    // Sem isto, uma estimativa de foto ficaria indistinguível do que o
    // atleta digitou de memória — e a ponderação de fontes trata as
    // duas com credenciais diferentes.
    expect(item.origemDado).toBe("estimativa-ia");
    expect(item.versaoFonte).toContain("gemini");
    expect(item.alimentoId).toBeNull();
    expect(item.descricao).toBe("Arroz branco 150 g");
  });

  it("corrigir a porção reescala os macros sem promover a estimativa", () => {
    const metade = reescalarItem(item, 75);

    expect(metade.calorias).toBe(96);
    expect(metade.descricao).toBe("Arroz branco 75 g");
    expect(metade.origemDado).toBe("estimativa-ia");
    expect(metade.confianca).toBe("media");
  });

  it("itens estimados somam no Prato como qualquer outro item", () => {
    expect(subtotalDoPrato([item, reescalarItem(item, 75)]).calorias).toBe(288);
  });
});
