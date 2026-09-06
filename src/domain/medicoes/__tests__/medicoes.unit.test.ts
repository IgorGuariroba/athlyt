import { describe, expect, it } from "vitest";
import { avaliarConfiancaCorporal, calcularPendenciasCadencia, consolidarCircunferencia, detectarAssimetriaSuspeita, gerarMetasProporcao } from "../index";

describe("protocolo de circunferências", () => {
  // `fita-v2`: uma leitura basta. Leituras extras continuam
  // aceitas para quem quiser conferir.
  it("aceita uma única leitura", () => {
    expect(consolidarCircunferencia([82.3])).toMatchObject({ ok: true, valorMm: 823 });
  });

  it("marca leitura única como moderada, nunca alta", () => {
    // Sem repetição não há evidência de reprodutibilidade; declarar
    // "alta" seria confiança fabricada.
    expect(consolidarCircunferencia([82.3])).toMatchObject({ qualidade: "moderada" });
  });

  it("consolida leituras concordantes pela mediana e eleva a qualidade", () => {
    expect(consolidarCircunferencia([82.1, 82.4])).toMatchObject({ ok: true, valorMm: 823, qualidade: "alta" });
  });

  it("aceita divergência moderada entre leituras sem pedir outra", () => {
    expect(consolidarCircunferencia([82, 83.2])).toMatchObject({ ok: true, qualidade: "baixa" });
  });

  it("recusa leituras muito diferentes entre si", () => {
    expect(consolidarCircunferencia([82, 84.5, 88])).toMatchObject({ ok: false });
  });

  it("recusa medida fora da faixa plausível", () => {
    expect(consolidarCircunferencia([5])).toMatchObject({ ok: false });
    expect(consolidarCircunferencia([])).toMatchObject({ ok: false });
  });
});

describe("confiança granular", () => {
  it("não limita nutrição por ausência de fotos", () => {
    const confianca = avaliarConfiancaCorporal({
      regioes: new Set(["cintura", "pescoco", "quadril"]),
      possuiGordura: false,
      possuiFotos: false,
      triagemTreinoCompleta: true,
      triagemNutricaoCompleta: true,
      saudeInformada: true,
    });
    expect(confianca.nutricao).toBe("confiavel");
    expect(confianca.simetriaBilateral).toBe("indisponivel");
  });
});

describe("cadência", () => {
  it("respeita limites diário, semanal e mensal", () => {
    const agora = new Date("2026-08-10T12:00:00Z");
    expect(calcularPendenciasCadencia({ agora, ultimoPeso: new Date("2026-08-10T08:00:00Z"), ultimaCintura: new Date("2026-08-01T12:00:00Z"), ultimaCompleta: new Date("2026-07-01T12:00:00Z"), ultimasFotos: new Date("2026-08-01T12:00:00Z") })).toEqual({ peso: false, cintura: true, completa: true, fotos: false });
  });
});

describe("metas e segurança", () => {
  it("gera meta de ciclo conservadora e versionada", () => {
    const [meta] = gerarMetasProporcao([{ regiao: "ombros", lado: "unico", leiturasMm: [1100, 1102], valorMm: 1102, qualidade: "alta", observadoEm: new Date() }], ["ombros"]);
    expect(meta).toMatchObject({ regiao: "ombros", direcao: "aumentar", metodologiaVersao: "trajetoria-v1" });
    expect(meta!.metaCicloMm).toBeGreaterThan(meta!.atualMm);
  });

  it("transforma assimetria com sintoma em cautela, não prioridade", () => {
    expect(detectarAssimetriaSuspeita({ direitoMm: 400, esquerdoMm: 380, dor: true })).toEqual({ diferencaMm: 20, confirmavel: false, cautela: true });
  });
});
