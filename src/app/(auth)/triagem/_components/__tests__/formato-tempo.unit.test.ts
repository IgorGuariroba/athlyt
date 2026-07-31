import { describe, expect, it } from "vitest";

import {
  descreverHoras,
  descreverMinutos,
  formatarHoras,
  formatarMinutos,
} from "../formato-tempo";

describe("formatarMinutos", () => {
  it("mantém minutos abaixo de uma hora", () => {
    expect(formatarMinutos(45)).toBe("45 min");
  });

  it("colapsa horas cheias", () => {
    expect(formatarMinutos(60)).toBe("1 h");
    expect(formatarMinutos(120)).toBe("2 h");
  });

  it("separa horas e minutos", () => {
    expect(formatarMinutos(90)).toBe("1 h 30 min");
  });
});

describe("descreverMinutos", () => {
  it("usa singular na primeira hora", () => {
    expect(descreverMinutos(60)).toBe("1 hora");
    expect(descreverMinutos(90)).toBe("1 hora e 30 minutos");
    expect(descreverMinutos(150)).toBe("2 horas e 30 minutos");
  });
});

describe("horas", () => {
  it("converte meias-horas em minutos", () => {
    expect(formatarHoras(7)).toBe("7 h");
    expect(formatarHoras(7.5)).toBe("7 h 30 min");
    expect(descreverHoras(7.5)).toBe("7 horas e 30 minutos");
  });
});
