import { describe, expect, it } from "vitest";

import {
  ehRitmoDescanso,
  formatarDescanso,
  opcoesDescanso,
  segundosDeDescanso,
} from "../descanso";

describe("opções de descanso", () => {
  it("oferece exatamente três opções, na mesma ordem", () => {
    expect(opcoesDescanso(90).map((o) => o.ritmo)).toEqual(["curto", "prescrito", "longo"]);
  });

  it("mantém o prescrito intacto para a tela não contradizer o plano", () => {
    // 100 não é múltiplo de 15: arredondar aqui faria o seletor exibir
    // "1:45" ao lado de uma prescrição de 100s.
    expect(segundosDeDescanso(100, "prescrito")).toBe(100);
  });

  it("deriva curto e longo do prescrito, em múltiplos de 15s", () => {
    expect(segundosDeDescanso(90, "curto")).toBe(60);
    expect(segundosDeDescanso(90, "longo")).toBe(135);
    expect(segundosDeDescanso(120, "curto")).toBe(75);
    expect(segundosDeDescanso(120, "longo")).toBe(180);
  });

  it("respeita os limites da prescrição em ambas as pontas", () => {
    expect(segundosDeDescanso(30, "curto")).toBe(30);
    expect(segundosDeDescanso(300, "longo")).toBe(300);
  });

  it("rotula cada opção pela duração e descreve o que ela é", () => {
    const [curto, prescrito, longo] = opcoesDescanso(90);

    expect(curto!.rotulo).toBe("1:00");
    expect(prescrito!.rotulo).toBe("1:30");
    expect(longo!.rotulo).toBe("2:15");
    expect(prescrito!.descricao).toBe("Descanso do plano: 1:30");
    expect(longo!.descricao).toBe("Descanso longo: 2:15");
  });

  it("formata como o timer da sessão", () => {
    expect(formatarDescanso(0)).toBe("0:00");
    expect(formatarDescanso(9)).toBe("0:09");
    expect(formatarDescanso(600)).toBe("10:00");
  });

  it("reconhece apenas os três ritmos ao ler preferência persistida", () => {
    expect(ehRitmoDescanso("curto")).toBe(true);
    expect(ehRitmoDescanso("medio")).toBe(false);
    expect(ehRitmoDescanso(null)).toBe(false);
  });
});
