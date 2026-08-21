import { describe, expect, it } from "vitest";
import { imagemRepresentativa } from "../imagem-representativa";

describe("imagemRepresentativa", () => {
  it("escolhe a imagem de um exercício do equipamento", () => {
    expect(imagemRepresentativa("dumbbell", [{
      equipment: "dumbbell",
      image: "images/flat/arnold-press-start.webp",
    }])).toBe("images/flat/arnold-press-start.webp");
  });

  it("retorna nulo quando não há exercício para o equipamento", () => {
    expect(imagemRepresentativa("hack_squat", [])).toBeNull();
  });
});
