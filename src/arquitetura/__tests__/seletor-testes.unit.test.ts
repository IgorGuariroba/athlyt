import { describe, expect, it } from "vitest";
import { decidir, determinarCamadas, parsearMudancasGit } from "../../../scripts/seletor-testes";

describe("seletor conservador de testes", () => {
  it("preserva caminhos com espaços e renomeações do diff NUL-delimitado", () => {
    expect(parsearMudancasGit("M\0src/arquivo com espaço.ts\0R100\0src/a.ts\0src/b.ts\0")).toEqual([
      { status: "M", caminhos: ["src/arquivo com espaço.ts"] },
      { status: "R", caminhos: ["src/a.ts", "src/b.ts"] },
    ]);
  });

  it("usa relacionados para código conhecido", () => {
    expect(decidir([{ status: "M", caminhos: ["src/domain/alimentos/prato.ts"] }])).toEqual({
      modo: "relacionados",
      motivo: "grafo de dependências do Vitest",
    });
  });

  it("faz fallback para configuração, exclusão e caminho desconhecido", () => {
    expect(decidir([{ status: "M", caminhos: ["package-lock.json"] }]).modo).toBe("completo");
    expect(decidir([{ status: "D", caminhos: ["src/domain/antigo.ts"] }]).modo).toBe("completo");
    expect(decidir([{ status: "M", caminhos: ["public/logo.svg"] }]).modo).toBe("completo");
    expect(decidir([{ status: "T", caminhos: ["src/domain/prato.ts"] }]).modo).toBe("completo");
  });

  it("mantém integração para mudanças sensíveis mesmo fora da main", () => {
    expect(determinarCamadas([{ status: "M", caminhos: ["drizzle.config.ts"] }])).toEqual({
      integracao: true,
      e2e: true,
    });
    expect(determinarCamadas([{ status: "M", caminhos: ["docs/decisao.md"] }])).toEqual({
      integracao: false,
      e2e: false,
    });
  });
});
