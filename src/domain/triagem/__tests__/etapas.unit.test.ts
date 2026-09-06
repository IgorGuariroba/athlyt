import { describe, expect, it } from "vitest";
import {
  etapaAnterior,
  etapaSeguinte,
  isEtapaId,
  posicaoNaCascata,
  ETAPAS_TRIAGEM,
} from "../etapas";

describe("isEtapaId", () => {
  it("reconhece um id de etapa válido", () => {
    expect(isEtapaId("idade")).toBe(true);
  });

  it("rejeita um segmento de rota desconhecido", () => {
    expect(isEtapaId("nao-existe")).toBe(false);
  });
});

describe("posicaoNaCascata", () => {
  it("primeira etapa é a posição 1 do total", () => {
    expect(posicaoNaCascata("idade")).toEqual({
      indice: 1,
      total: ETAPAS_TRIAGEM.length,
    });
  });

  it("última etapa é a posição = total", () => {
    const ultima = ETAPAS_TRIAGEM[ETAPAS_TRIAGEM.length - 1]!.id;
    expect(posicaoNaCascata(ultima)).toEqual({
      indice: ETAPAS_TRIAGEM.length,
      total: ETAPAS_TRIAGEM.length,
    });
  });
});

describe("etapaAnterior", () => {
  it("retorna null para a primeira etapa", () => {
    expect(etapaAnterior("idade")).toBeNull();
  });

  it("retorna a etapa anterior na ordem fixa", () => {
    expect(etapaAnterior("altura")).toBe("sexo");
  });
});

describe("etapaSeguinte", () => {
  it("retorna a próxima etapa na ordem fixa", () => {
    expect(etapaSeguinte("sexo")).toBe("altura");
  });

  it("retorna null após a última etapa", () => {
    const ultima = ETAPAS_TRIAGEM[ETAPAS_TRIAGEM.length - 1]!.id;
    expect(etapaSeguinte(ultima)).toBeNull();
  });
});
