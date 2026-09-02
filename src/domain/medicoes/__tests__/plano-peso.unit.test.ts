import { describe, expect, it } from "vitest";

import {
  HORIZONTE_META_DIAS,
  montarPlanoDePeso,
  type MedicaoPeso,
} from "../plano-peso";

const INICIO = new Date(2026, 0, 1, 8, 0);
const DIA_EM_MS = 24 * 60 * 60 * 1000;
const noDia = (dias: number, pesoKg: number): MedicaoPeso => ({
  data: new Date(INICIO.getTime() + dias * DIA_EM_MS),
  pesoKg,
});
const diaDo = (data: Date) =>
  Math.round((data.getTime() - INICIO.getTime()) / DIA_EM_MS);

describe("montarPlanoDePeso", () => {
  it("ancora o eixo na primeira medição e projeta a meta no prazo fixo", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90), noDia(30, 87)],
      pesoMetaKg: 78,
      horizonteDias: 120,
      agora: noDia(30, 0).data,
    });

    expect(plano?.inicio).toEqual(INICIO);
    expect(diaDo(plano!.fim)).toBe(HORIZONTE_META_DIAS);
    expect(plano?.linhaMeta).toEqual([
      { data: INICIO, pesoKg: 90 },
      { data: noDia(HORIZONTE_META_DIAS, 0).data, pesoKg: 78 },
    ]);
  });

  it("mantém a inclinação da meta ao trocar o horizonte — o filtro é zoom, não outro plano", () => {
    const entrada = {
      medicoes: [noDia(0, 90)],
      pesoMetaKg: 78,
      agora: noDia(10, 0).data,
    };
    const inclinacao = (horizonteDias: 30 | 90 | 120) => {
      const linha = montarPlanoDePeso({ ...entrada, horizonteDias })!.linhaMeta!;
      const primeiro = linha[0];
      const ultimo = linha[linha.length - 1];
      return (
        (ultimo.pesoKg - primeiro.pesoKg) /
        ((ultimo.data.getTime() - primeiro.data.getTime()) / DIA_EM_MS)
      );
    };

    expect(inclinacao(30)).toBeCloseTo(inclinacao(120), 10);
    expect(inclinacao(90)).toBeCloseTo(inclinacao(120), 10);
  });

  it("recorta as medições fora do horizonte escolhido", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90), noDia(20, 88), noDia(60, 85)],
      pesoMetaKg: 78,
      horizonteDias: 30,
      agora: noDia(60, 0).data,
    });

    expect(plano?.medicoes.map(({ pesoKg }) => pesoKg)).toEqual([90, 88]);
    expect(diaDo(plano!.fim)).toBe(30);
  });

  it("estende o eixo até hoje e achata a meta depois do prazo vencido", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90), noDia(150, 80)],
      pesoMetaKg: 78,
      horizonteDias: 120,
      agora: noDia(150, 0).data,
    });

    expect(diaDo(plano!.fim)).toBe(150);
    expect(plano?.linhaMeta?.map(({ pesoKg }) => pesoKg)).toEqual([90, 78, 78]);
    expect(diaDo(plano!.linhaMeta![2].data)).toBe(150);
  });

  it("não estica os recortes curtos até hoje, senão os três botões desenhariam o mesmo", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90)],
      pesoMetaKg: 78,
      horizonteDias: 30,
      agora: noDia(150, 0).data,
    });

    expect(diaDo(plano!.fim)).toBe(30);
  });

  it("inclui a meta na escala de peso mesmo quando nenhuma medição chega perto", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90), noDia(10, 89.5)],
      pesoMetaKg: 70,
      horizonteDias: 120,
      agora: noDia(10, 0).data,
    });

    expect(plano?.minKg).toBe(70);
    expect(plano?.maxKg).toBe(90);
  });

  it("desenha só a linha de meta quando o recorte não tem medição além da inicial", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90), noDia(100, 82)],
      pesoMetaKg: 78,
      horizonteDias: 30,
      agora: noDia(100, 0).data,
    });

    expect(plano?.medicoes).toHaveLength(1);
    expect(plano?.linhaMeta).toHaveLength(2);
  });

  it("dispensa a linha de meta enquanto não houver meta registrada", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(0, 90)],
      horizonteDias: 120,
      agora: noDia(0, 0).data,
    });

    expect(plano?.linhaMeta).toBeNull();
    expect(plano?.minKg).toBe(90);
  });

  it("sem peso inicial não há plano — o dia 0 é a âncora de tudo", () => {
    expect(
      montarPlanoDePeso({
        medicoes: [],
        pesoMetaKg: 78,
        horizonteDias: 120,
        agora: INICIO,
      }),
    ).toBeNull();
  });

  it("ordena medições fora de ordem antes de eleger a inicial", () => {
    const plano = montarPlanoDePeso({
      medicoes: [noDia(20, 88), noDia(0, 90), noDia(10, 89)],
      pesoMetaKg: 78,
      horizonteDias: 120,
      agora: noDia(20, 0).data,
    });

    expect(plano?.inicio).toEqual(INICIO);
    expect(plano?.medicoes.map(({ pesoKg }) => pesoKg)).toEqual([90, 89, 88]);
  });
});
