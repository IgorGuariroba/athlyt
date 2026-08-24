import { describe, expect, it } from "vitest";
import { MARCA_ZERO, avaliarRecorde, combinarMarcas, e1rm, estimativaRm, marcaDaSerie, melhorMarca } from "../recorde";

const historico = melhorMarca([{ cargaKg: 60, repeticoes: 9 }]);

describe("avaliarRecorde", () => {
  it("não marca recorde para série mais fraca com a mesma carga", () => {
    expect(avaliarRecorde({ cargaKg: 60, repeticoes: 5 }, historico)).toBeNull();
  });

  it("não marca recorde para série idêntica à referência", () => {
    expect(avaliarRecorde({ cargaKg: 60, repeticoes: 9 }, historico)).toBeNull();
  });

  it("marca recorde de força quando o 1RM estimado supera o histórico", () => {
    expect(avaliarRecorde({ cargaKg: 60, repeticoes: 10 }, historico)).toMatchObject({ tipo: "e1rm" });
  });

  it("marca recorde de carga quando o peso sobe mesmo com menos repetições", () => {
    expect(avaliarRecorde({ cargaKg: 65, repeticoes: 3 }, historico)).toMatchObject({ tipo: "carga" });
  });

  it("não marca recorde sem histórico do exercício", () => {
    expect(avaliarRecorde({ cargaKg: 48, repeticoes: 7 }, MARCA_ZERO)).toBeNull();
  });

  it("ignora série sem carga ou sem repetições", () => {
    expect(avaliarRecorde({ cargaKg: 0, repeticoes: 12 }, historico)).toBeNull();
    expect(avaliarRecorde({ cargaKg: 60, repeticoes: null }, historico)).toBeNull();
  });

  it("deixa de marcar recorde depois que a marca da sessão já foi superada", () => {
    const primeira = { cargaKg: 62.5, repeticoes: 9 };
    const recorde = avaliarRecorde(primeira, historico);
    expect(recorde).not.toBeNull();
    const atualizada = combinarMarcas(historico, marcaDaSerie(primeira));
    expect(avaliarRecorde({ cargaKg: 60, repeticoes: 9 }, atualizada)).toBeNull();
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
