import { describe, expect, it } from "vitest";

import { descreverDistanciaAMeta } from "../plano-peso";

describe("descreverDistanciaAMeta", () => {
  it("informa quanto falta enquanto a meta não foi atingida", () => {
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 105.8, pesoAtualKg: 105.8, pesoMetaKg: 95 }),
    ).toBe("Faltam 10,8 kg");
  });

  it("vale para ganho de massa, onde a meta está acima", () => {
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 70, pesoAtualKg: 72.5, pesoMetaKg: 78 }),
    ).toBe("Faltam 5,5 kg");
  });

  it("anuncia a meta alcançada ao cruzar o alvo, em qualquer direção", () => {
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 105, pesoAtualKg: 94.6, pesoMetaKg: 95 }),
    ).toBe("Meta alcançada");
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 70, pesoAtualKg: 78.2, pesoMetaKg: 78 }),
    ).toBe("Meta alcançada");
  });

  it("trata o alvo exato como alcançado", () => {
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 105, pesoAtualKg: 95, pesoMetaKg: 95 }),
    ).toBe("Meta alcançada");
  });

  it("volta a cobrar distância se o peso retornar ao lado errado do alvo", () => {
    // Estado atual contra alvo atual. "Alcançada em algum momento" é
    // outra informação, e não é esta tela que a responde.
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 105, pesoAtualKg: 96.2, pesoMetaKg: 95 }),
    ).toBe("Faltam 1,2 kg");
  });

  it("usa a direção original da meta, não a distância absoluta", () => {
    // Partiu de 105 rumo a 95 e despencou para 88: ultrapassou o alvo
    // no sentido pretendido, então não há o que faltar.
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 105, pesoAtualKg: 88, pesoMetaKg: 95 }),
    ).toBe("Meta alcançada");
  });

  it("cala-se em manutenção, quando a meta é o próprio ponto de partida", () => {
    // Não há percurso: "Meta alcançada" parabenizaria por nada, e
    // continuaria dizendo isso mesmo se o peso se afastasse do alvo.
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 95, pesoAtualKg: 95, pesoMetaKg: 95 }),
    ).toBeNull();
    expect(
      descreverDistanciaAMeta({ pesoInicialKg: 85, pesoAtualKg: 86.4, pesoMetaKg: 85 }),
    ).toBeNull();
  });
});
