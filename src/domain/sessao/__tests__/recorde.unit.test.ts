import { describe, expect, it } from "vitest";
import { MARCA_ZERO, e1rm, estimativaRm, linhaDeMarcas, melhorMarca, melhorRecordeDaLinha, type SerieDaLinha } from "../recorde";

const historico = melhorMarca([{ cargaKg: 60, repeticoes: 9 }]);

function serie(numero: number, cargaKg: number | null, repeticoes: number | null, registrada = true): SerieDaLinha {
  return { numero, cargaKg, repeticoes, registrada };
}

function recordeDa(series: SerieDaLinha[], marca = historico) {
  return linhaDeMarcas({ historico: marca, series }).map((entrada) => entrada.recorde);
}

describe("linhaDeMarcas — recorde de cada série", () => {
  it("não marca recorde para série mais fraca com a mesma carga", () => {
    expect(recordeDa([serie(1, 60, 5)])[0]).toBeNull();
  });

  it("não marca recorde para série idêntica à referência", () => {
    expect(recordeDa([serie(1, 60, 9)])[0]).toBeNull();
  });

  it("marca recorde de força quando o 1RM estimado supera o histórico", () => {
    expect(recordeDa([serie(1, 60, 10)])[0]).toMatchObject({ tipo: "e1rm" });
  });

  it("marca recorde de carga quando o peso sobe mesmo com menos repetições", () => {
    expect(recordeDa([serie(1, 65, 3)])[0]).toMatchObject({ tipo: "carga" });
  });

  it("não marca recorde sem histórico do exercício", () => {
    expect(recordeDa([serie(1, 48, 7)], MARCA_ZERO)[0]).toBeNull();
  });

  it("ignora série sem carga ou sem repetições", () => {
    expect(recordeDa([serie(1, 0, 12), serie(2, 60, null)])).toEqual([null, null]);
  });

  it("não avalia série ainda não registrada", () => {
    expect(recordeDa([serie(1, 80, 10, false)])[0]).toBeNull();
  });

  it("deixa de marcar recorde depois que a marca da sessão já foi superada", () => {
    const [primeira, segunda] = recordeDa([serie(1, 62.5, 9), serie(2, 60, 9)]);
    expect(primeira).not.toBeNull();
    expect(segunda).toBeNull();
  });
});

describe("linhaDeMarcas — referência de cada série", () => {
  it("acumula as séries já registradas hoje sobre o histórico", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(1, 62.5, 9), serie(2, 60, 9)] });
    expect(linha[0].referencia).toEqual(historico);
    expect(linha[1].referencia.cargaKg).toBe(62.5);
  });

  it("conta a série registrada só na fila local na referência da seguinte", () => {
    // Defeito vivo antes desta interface: `registrada` vinha só do
    // servidor, então a série 2 offline era medida contra o histórico e
    // anunciava um recorde que o resumo depois retirava.
    const linha = linhaDeMarcas({ historico, series: [serie(1, 70, 9), serie(2, 65, 9)] });
    expect(linha[1].referencia.cargaKg).toBe(70);
    expect(linha[1].recorde).toBeNull();
  });

  it("séries não registradas não entram na referência das seguintes", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(1, 70, 9, false), serie(2, 62.5, 9)] });
    expect(linha[1].referencia).toEqual(historico);
    expect(linha[1].recorde).toMatchObject({ tipo: "e1rm" });
  });

  it("sem histórico entregue, a referência inicial é a marca zero", () => {
    expect(linhaDeMarcas({ series: [serie(1, 60, 9)] })[0].referencia).toEqual(MARCA_ZERO);
  });

  it("responde na ordem dos números da série, não na de entrada", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(2, 60, 9), serie(1, 62.5, 9)] });
    expect(linha.map((entrada) => entrada.numero)).toEqual([1, 2]);
    expect(linha[1].referencia.cargaKg).toBe(62.5);
  });
});

describe("linhaDeMarcas — qual série ostenta o selo", () => {
  it("só a série registrada mais recente ostenta o selo", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(1, 62.5, 9), serie(2, 70, 9)] });
    expect(linha.map((entrada) => entrada.ostentaSelo)).toEqual([false, true]);
  });

  it("o selo deixa a série anterior assim que a posterior é registrada", () => {
    const antes = linhaDeMarcas({ historico, series: [serie(1, 62.5, 9), serie(2, 70, 9, false)] });
    expect(antes[0].ostentaSelo).toBe(true);

    const depois = linhaDeMarcas({ historico, series: [serie(1, 62.5, 9), serie(2, 70, 9)] });
    expect(depois[0].ostentaSelo).toBe(false);
  });

  it("série posterior sem recorde não deixa nenhum selo na tela", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(1, 62.5, 9), serie(2, 50, 9)] });
    expect(linha.every((entrada) => !entrada.ostentaSelo)).toBe(true);
  });
});

describe("melhorRecordeDaLinha", () => {
  it("escolhe o recorde de maior significado entre as séries", () => {
    const linha = linhaDeMarcas({ historico, series: [serie(1, 65, 3), serie(2, 66, 10)] });
    expect(melhorRecordeDaLinha(linha)).toMatchObject({ tipo: "e1rm" });
  });

  it("sem recorde algum, devolve nulo", () => {
    expect(melhorRecordeDaLinha(linhaDeMarcas({ historico, series: [serie(1, 50, 5)] }))).toBeNull();
  });
});

describe("estimativas", () => {
  it("usa Epley e limita a repetição considerada", () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
    expect(e1rm(100, 30)).toBe(e1rm(100, 12));
  });

  it("estima carga para um número alvo de repetições", () => {
    expect(estimativaRm(60, 9, 10)).toBeCloseTo(58.5, 1);
  });
});
