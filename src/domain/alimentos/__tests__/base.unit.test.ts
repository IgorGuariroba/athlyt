import { describe, expect, it } from "vitest";
import {
  BASE_ALIMENTOS,
  buscarAlimentos,
  encontrarAlimento,
  macrosDaPorcao,
  porcoesDoAlimento,
} from "../base";

describe("base nutricional auditável", () => {
  it("todo alimento carrega fonte, versão/data e confiança (user story 57)", () => {
    for (const alimento of BASE_ALIMENTOS) {
      expect(alimento.proveniencia.fonte).toBeTruthy();
      expect(alimento.proveniencia.versao).toBeTruthy();
      expect(alimento.proveniencia.atualizadaEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["alta", "media", "baixa"]).toContain(alimento.confianca);
    }
  });

  it("ids são únicos e estáveis: eles atravessam o banco", () => {
    const ids = BASE_ALIMENTOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("todo alimento tem ao menos uma porção, e a primeira é a padrão", () => {
    for (const alimento of BASE_ALIMENTOS) {
      expect(porcoesDoAlimento(alimento.id).length).toBeGreaterThan(0);
    }
  });
});

describe("busca de alimentos", () => {
  it("encontra por nome parcial, sem exigir acento", () => {
    const resultados = buscarAlimentos("feijao");
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0].nome.toLowerCase()).toContain("feij");
  });

  it("é insensível a caixa e a espaços em volta", () => {
    expect(buscarAlimentos("  ARROZ  ").length).toBeGreaterThan(0);
  });

  it("busca vazia não devolve a base inteira como se fosse resultado", () => {
    expect(buscarAlimentos("")).toEqual([]);
    expect(buscarAlimentos("   ")).toEqual([]);
  });

  it("termo sem correspondência devolve lista vazia, não erro", () => {
    expect(buscarAlimentos("zzzznadaexiste")).toEqual([]);
  });

  it("prioriza quem começa com o termo sobre quem apenas o contém", () => {
    const resultados = buscarAlimentos("arroz");
    expect(resultados[0].nome.toLowerCase().startsWith("arroz")).toBe(true);
  });

  it("também encontra por sinônimo popular", () => {
    const resultados = buscarAlimentos("frango");
    expect(resultados.some((r) => r.id.includes("frango"))).toBe(true);
  });
});

describe("cálculo de porção", () => {
  it("escala macros proporcionalmente à quantidade em gramas", () => {
    const alimento = encontrarAlimento("arroz-branco-cozido")!;
    const cem = macrosDaPorcao(alimento, { quantidade: 100, unidade: "g" });
    const duzentos = macrosDaPorcao(alimento, { quantidade: 200, unidade: "g" });
    expect(duzentos.calorias).toBe(cem.calorias * 2);
    expect(duzentos.proteinaG).toBe(cem.proteinaG * 2);
  });

  it("unidade caseira usa o peso declarado da porção", () => {
    const alimento = encontrarAlimento("arroz-branco-cozido")!;
    const porcao = porcoesDoAlimento(alimento.id).find((p) => p.unidade !== "g")!;
    const porUnidade = macrosDaPorcao(alimento, { quantidade: 1, unidade: porcao.unidade });
    const equivalente = macrosDaPorcao(alimento, { quantidade: porcao.gramas, unidade: "g" });
    expect(porUnidade.calorias).toBe(equivalente.calorias);
  });

  it("quantidade zero produz macros zerados, não NaN", () => {
    const alimento = encontrarAlimento("arroz-branco-cozido")!;
    expect(macrosDaPorcao(alimento, { quantidade: 0, unidade: "g" })).toEqual({
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });
  });

  it("quantidade negativa é rejeitada: não existe consumo negativo", () => {
    const alimento = encontrarAlimento("arroz-branco-cozido")!;
    expect(() => macrosDaPorcao(alimento, { quantidade: -50, unidade: "g" })).toThrow(/negativa/i);
  });

  it("unidade desconhecida falha em vez de calcular silenciosamente errado", () => {
    const alimento = encontrarAlimento("arroz-branco-cozido")!;
    expect(() => macrosDaPorcao(alimento, { quantidade: 1, unidade: "balde" })).toThrow(/unidade/i);
  });
});
