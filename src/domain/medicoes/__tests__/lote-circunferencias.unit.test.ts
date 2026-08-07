import { describe, expect, it } from "vitest";
import {
  avaliarLoteCircunferencias,
  mensagemDoLote,
} from "../lote-circunferencias";

/**
 * Uma leitura por região (`fita-v2`, ADR 0007). O lote existe para que
 * a tela saiba de uma só vez quais regiões falharam, em vez de revelar
 * um problema por submissão.
 */
describe("lote de circunferências", () => {
  it("aceita todas as regiões medidas uma vez", () => {
    const { validos, falhas } = avaliarLoteCircunferencias([
      { prefixo: "cintura", leituras: [84.0] },
      { prefixo: "pescoco", leituras: [38.0] },
      { prefixo: "quadril", leituras: [98.0] },
    ]);
    expect(validos.map((v) => v.prefixo)).toEqual(["cintura", "pescoco", "quadril"]);
    expect(falhas).toEqual([]);
  });

  it("ignora regiões em branco em vez de acusá-las", () => {
    // A coleta é parcial por desenho: registrar só o que foi medido agora.
    const { validos, falhas } = avaliarLoteCircunferencias([
      { prefixo: "torax", leituras: [102.0] },
      { prefixo: "ombros", leituras: [] },
    ]);
    expect(validos.map((v) => v.prefixo)).toEqual(["torax"]);
    expect(falhas).toEqual([]);
  });

  it("reporta todas as regiões inválidas de uma vez", () => {
    const { validos, falhas } = avaliarLoteCircunferencias([
      { prefixo: "cintura", leituras: [4] },
      { prefixo: "pescoco", leituras: [38.0] },
      { prefixo: "quadril", leituras: [900] },
    ]);
    expect(validos.map((v) => v.prefixo)).toEqual(["pescoco"]);
    expect(falhas.map((f) => f.prefixo)).toEqual(["cintura", "quadril"]);
  });

  it("mantém o erro específico quando só uma região falha", () => {
    const falhas = [{ prefixo: "cintura", erro: "Informe a medida em centímetros." }];
    expect(mensagemDoLote(falhas)).toBe("Informe a medida em centímetros.");
  });

  it("resume por contagem quando várias regiões falham", () => {
    const falhas = [
      { prefixo: "cintura", erro: "Informe a medida em centímetros." },
      { prefixo: "quadril", erro: "Informe a medida em centímetros." },
    ];
    expect(mensagemDoLote(falhas)).toMatch(/2 regiões/);
  });
});
