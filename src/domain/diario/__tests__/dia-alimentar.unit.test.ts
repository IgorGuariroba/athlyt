import { describe, expect, it } from "vitest";
import {
  diaAlimentar,
  diaVizinho,
  horaLocal,
  instanteDeHoraLocal,
  intervaloUtcDoDia,
} from "../dia-alimentar";

describe("dia alimentar no fuso do usuário", () => {
  it("uma ceia às 22h de São Paulo pertence ao dia local, não ao dia UTC", () => {
    // 2026-03-10T01:00Z = 2026-03-09 22:00 em São Paulo.
    const ceia = new Date("2026-03-10T01:00:00.000Z");
    expect(diaAlimentar(ceia, "America/Sao_Paulo")).toBe("2026-03-09");
    expect(diaAlimentar(ceia, "UTC")).toBe("2026-03-10");
  });

  it("intervalo UTC cobre exatamente as 24 horas locais do dia", () => {
    const { inicio, fim } = intervaloUtcDoDia("2026-03-09", "America/Sao_Paulo");
    expect(inicio.toISOString()).toBe("2026-03-09T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    expect(diaAlimentar(inicio, "America/Sao_Paulo")).toBe("2026-03-09");
    expect(diaAlimentar(new Date(fim.getTime() - 1), "America/Sao_Paulo")).toBe("2026-03-09");
  });

  it("todo instante do intervalo pertence ao dia, inclusive em fuso com verão", () => {
    const { inicio, fim } = intervaloUtcDoDia("2026-03-08", "America/New_York");
    for (let t = inicio.getTime(); t < fim.getTime(); t += 30 * 60_000) {
      expect(diaAlimentar(new Date(t), "America/New_York")).toBe("2026-03-08");
    }
  });

  it("o dia vizinho anda exatamente um dia, sem pular nem repetir", () => {
    // Regressão: a âncora na meia-noite fazia "dia anterior" saltar de
    // 02/08 para 31/07, escondendo um dia inteiro do Diário.
    expect(diaVizinho("2026-08-02", -1, "America/Sao_Paulo")).toBe("2026-08-01");
    expect(diaVizinho("2026-08-02", 1, "America/Sao_Paulo")).toBe("2026-08-03");
    expect(diaVizinho("2026-01-01", -1, "America/Sao_Paulo")).toBe("2025-12-31");
    expect(diaVizinho("2026-03-01", -1, "America/Sao_Paulo")).toBe("2026-02-28");
  });

  it("navegar 60 dias para trás e voltar retorna ao mesmo dia, mesmo com horário de verão", () => {
    for (const fuso of ["America/Sao_Paulo", "America/New_York", "UTC"]) {
      let dia = "2026-04-15";
      for (let i = 0; i < 60; i++) dia = diaVizinho(dia, -1, fuso);
      for (let i = 0; i < 60; i++) dia = diaVizinho(dia, 1, fuso);
      expect(dia).toBe("2026-04-15");
    }
  });

  it("hora local e instante local são inversos dentro do dia", () => {
    const instante = instanteDeHoraLocal("2026-03-09", "12:30", "America/Sao_Paulo");
    expect(horaLocal(instante, "America/Sao_Paulo")).toBe("12:30");
    expect(diaAlimentar(instante, "America/Sao_Paulo")).toBe("2026-03-09");
  });
});
