import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  CATEGORIAS_EQUIPAMENTO,
  EQUIPAMENTOS,
  equipamentosDaCategoria,
  equipamentosSugeridos,
  imagemEquipamento,
  isEquipamentoId,
  rotuloEquipamento,
} from "../equipamentos";

/**
 * O catálogo é a fronteira entre o que o usuário declara ter e o que a
 * IA pode prescrever. Os invariantes abaixo protegem essa fronteira:
 * id duplicado silenciaria um equipamento na seleção, e categoria
 * órfã o esconderia da tela inteira.
 */
describe("catálogo de equipamentos", () => {
  it("não repete o mesmo equipamento com nomes externos diferentes", () => {
    const rotulos = EQUIPAMENTOS.map((e) => e.rotulo.toLocaleLowerCase());
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  it("não tem ids duplicados", () => {
    const ids = EQUIPAMENTOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo equipamento pertence a uma categoria declarada", () => {
    const categorias = new Set(CATEGORIAS_EQUIPAMENTO.map((c) => c.id));
    for (const equipamento of EQUIPAMENTOS) {
      expect(categorias.has(equipamento.categoria)).toBe(true);
    }
  });

  it("toda categoria declarada tem ao menos um equipamento", () => {
    for (const categoria of CATEGORIAS_EQUIPAMENTO) {
      expect(equipamentosDaCategoria(categoria.id).length).toBeGreaterThan(0);
    }
  });

  it("reconhece id do catálogo e rejeita desconhecido", () => {
    expect(isEquipamentoId("halteres")).toBe(true);
    expect(isEquipamentoId("maquina-inexistente")).toBe(false);
  });

  it("resolve o rótulo de exibição a partir do id", () => {
    expect(rotuloEquipamento("leg-press")).toBe("Leg press");
    expect(rotuloEquipamento("nao-existe")).toBeUndefined();
  });

  it("possui miniatura genérica para equipamento personalizado", () => {
    const svg = readFileSync(
      join(process.cwd(), "public/equipamentos/personalizado.svg"),
      "utf8",
    );
    expect(svg).toContain('viewBox="0 0 160 112"');
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain("#111");
  });

  it("todo item possui miniatura SVG padronizada em preto e branco", () => {
    for (const equipamento of EQUIPAMENTOS) {
      const caminhoPublico = imagemEquipamento(equipamento.id);
      expect(caminhoPublico).toBe(`/equipamentos/${equipamento.id}.svg`);

      const svg = readFileSync(
        join(process.cwd(), "public", caminhoPublico),
        "utf8",
      );
      expect(svg).toContain('viewBox="0 0 160 112"');
      expect(svg).toContain('fill="#fff"');
      expect(svg).toContain("#111");
    }
  });
});

describe("sugestão por local de treino", () => {
  it("academia completa sugere mais equipamentos que academia de condomínio", () => {
    expect(equipamentosSugeridos("academia-completa").length).toBeGreaterThan(
      equipamentosSugeridos("condominio").length,
    );
  });

  it("condomínio sugere mais que casa", () => {
    expect(equipamentosSugeridos("condominio").length).toBeGreaterThan(
      equipamentosSugeridos("casa").length,
    );
  });

  it("nem toda academia completa tem tudo: a sugestão deixa margem para revisão", () => {
    // Sugerir o catálogo inteiro equivale a não sugerir nada — a tela de
    // revisão só tem valor se a sugestão puder estar errada.
    expect(equipamentosSugeridos("academia-completa").length).toBeLessThan(
      EQUIPAMENTOS.length,
    );
  });

  it("casa sugere apenas equipamentos plausíveis fora de academia", () => {
    expect(equipamentosSugeridos("casa")).toEqual([
      "halteres",
      "elasticos",
      "colchonete",
    ]);
  });

  it("treino sem equipamentos devolve lista vazia", () => {
    expect(equipamentosSugeridos("sem-equipamentos")).toEqual([]);
  });

  it("toda sugestão contém apenas ids válidos do catálogo", () => {
    for (const local of [
      "academia-completa",
      "condominio",
      "casa",
      "sem-equipamentos",
    ] as const) {
      for (const id of equipamentosSugeridos(local)) {
        expect(isEquipamentoId(id)).toBe(true);
      }
    }
  });
});
