import { describe, expect, it } from "vitest";

import {
  LIMITE_AUDIO_REFEICAO_BYTES,
  LIMITE_DESCRICAO,
  precisaConverterAudio,
  validarAudioRefeicao,
  validarDescricaoRefeicao,
} from "../audio-refeicao";
import { itemEstimado, renomearItem } from "../prato";
import { rotuloDeConfianca } from "../proveniencia";

describe("fronteira do áudio da refeição", () => {
  it("aceita o container gravado pelo navegador, com codec anexado ao tipo", () => {
    const audio = validarAudioRefeicao({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm;codecs=opus",
    });
    expect(audio.mediaType).toBe("audio/webm");
  });

  it("aceita o MP4 que o Safari grava: ele é convertido, não recusado", () => {
    // Recusar aqui devolvia ao usuário de iPhone um erro por algo que o
    // servidor sabe resolver — a conversão é responsabilidade da action.
    const audio = validarAudioRefeicao({
      bytes: new Uint8Array([1]),
      contentType: "audio/mp4",
    });
    expect(audio.mediaType).toBe("audio/mp4");
    expect(precisaConverterAudio(audio.mediaType)).toBe(true);
  });

  it("recusa formato fora da lista antes de qualquer chamada externa", () => {
    expect(() =>
      validarAudioRefeicao({ bytes: new Uint8Array([1]), contentType: "application/pdf" }),
    ).toThrow(/Formato de áudio/);
  });

  it("recusa áudio vazio com orientação de saída", () => {
    expect(() =>
      validarAudioRefeicao({ bytes: new Uint8Array(), contentType: "audio/webm" }),
    ).toThrow(/vazio/i);
  });

  it("recusa áudio acima do teto", () => {
    expect(() =>
      validarAudioRefeicao({
        bytes: new Uint8Array(LIMITE_AUDIO_REFEICAO_BYTES + 1),
        contentType: "audio/webm",
      }),
    ).toThrow(/longo/i);
  });
});

describe("fronteira da descrição da refeição", () => {
  it("normaliza espaços em vez de recusar o texto por formatação", () => {
    expect(validarDescricaoRefeicao("  dois   ovos\ne pão ")).toBe("dois ovos e pão");
  });

  it("recusa descrição vazia dizendo o que fazer", () => {
    expect(() => validarDescricaoRefeicao("   ")).toThrow(/Descreva o que você comeu/);
  });

  it("recusa descrição longa demais informando o limite", () => {
    expect(() => validarDescricaoRefeicao("a".repeat(LIMITE_DESCRICAO + 1))).toThrow(
      new RegExp(String(LIMITE_DESCRICAO)),
    );
  });
});

describe("item estimado por descrição", () => {
  const item = itemEstimado({
    descricao: "Arroz branco cozido",
    quantidade: 50,
    calorias: 64, proteinaG: 1, carboidratosG: 14, gordurasG: 0, fibrasG: 1,
    confianca: "media",
    modelo: "google/gemini-2.5-flash-lite",
    origemEstimativa: "texto",
  });

  it("guarda a origem da estimativa para o registro continuar auditável", () => {
    // Um número vindo de descrição e um vindo de foto merecem
    // desconfianças diferentes na revisão do dia (user story 30).
    expect(item.origemDado).toBe("estimativa-ia");
    expect(item.fonte).toBe("Estimativa por descrição");
  });

  it("estimativa por foto continua sendo o padrão dos registros já gravados", () => {
    const porFoto = itemEstimado({
      descricao: "Arroz", quantidade: 50,
      calorias: 64, proteinaG: 1, carboidratosG: 14, gordurasG: 0, fibrasG: 1,
      confianca: "media", modelo: "m",
    });
    expect(porFoto.fonte).toBe("Estimativa por foto");
  });

  it("o rótulo de confiança não fala em foto quando a estimativa veio de descrição", () => {
    expect(rotuloDeConfianca("baixa", "estimativa-ia", "texto")).not.toMatch(/foto/i);
    expect(rotuloDeConfianca("baixa", "estimativa-ia", "foto")).toMatch(/foto/i);
  });

  it("corrigir o alimento preserva macros e proveniência", () => {
    const corrigido = renomearItem(item, "Arroz integral cozido");

    expect(corrigido.descricao).toBe("Arroz integral cozido 50 g");
    expect(corrigido.calorias).toBe(item.calorias);
    expect(corrigido.origemDado).toBe("estimativa-ia");
    expect(corrigido.confianca).toBe("media");
  });

  it("preserva o espaço em digitação, que é estado intermível e não texto final", () => {
    // Um campo controlado chama isto a cada tecla: aparar a ponta faz o
    // espaço sumir no momento em que é digitado, e nenhum nome composto
    // pode ser escrito ("Coca cola zero" virava "Cocacolazero").
    expect(renomearItem(item, "Coca ").descricao).toBe("Coca  50 g");
    expect(renomearItem(item, "Coca cola zero").descricao).toBe("Coca cola zero 50 g");
  });
});
