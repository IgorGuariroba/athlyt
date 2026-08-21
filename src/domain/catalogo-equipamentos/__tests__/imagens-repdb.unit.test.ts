import { describe, expect, it } from "vitest";
import { IMAGENS_EQUIPAMENTOS_REPDB } from "@/domain/triagem/imagens-equipamentos-repdb";

describe("imagens RepDB dos equipamentos", () => {
  it("cobre os equipamentos Athlyt com correspondência no dataset", () => {
    for (const id of [
      "banco-reto",
      "cadeira-extensora",
      "mesa-flexora",
      "supino-maquina",
      "voador",
      "remada-maquina",
      "polia-alta",
      "polia-baixa",
      "paralelas",
    ]) {
      expect(IMAGENS_EQUIPAMENTOS_REPDB[id as keyof typeof IMAGENS_EQUIPAMENTOS_REPDB]).toMatch(
        id === "polia-alta" || id === "polia-baixa"
          ? /^\/equipamentos\/(polia-alta|polia-baixa)\.svg$/
          : /^https:\/\//,
      );
    }
  });
});
