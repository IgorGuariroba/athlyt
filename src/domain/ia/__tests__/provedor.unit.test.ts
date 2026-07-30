import { afterEach, describe, expect, it, vi } from "vitest";
import { ambienteIA, modeloDe, OPCOES_PROVEDOR } from "../provedor";
import { RECORTES } from "../contexto/recortes";
import type { OperacaoIA } from "../contexto/tipos";

const OPERACOES = Object.keys(RECORTES) as OperacaoIA[];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ambienteIA", () => {
  it("respeita IA_AMBIENTE quando declarado", () => {
    vi.stubEnv("IA_AMBIENTE", "producao");
    expect(ambienteIA()).toBe("producao");
  });

  it("ignora valor inválido e cai no default por NODE_ENV", () => {
    vi.stubEnv("IA_AMBIENTE", "qualquer-coisa");
    vi.stubEnv("NODE_ENV", "production");
    expect(ambienteIA()).toBe("producao");
  });

  it("usa desenvolvimento fora de produção, para não gastar crédito por acidente", () => {
    vi.stubEnv("IA_AMBIENTE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(ambienteIA()).toBe("desenvolvimento");
  });
});

describe("modeloDe", () => {
  it("cobre toda operação declarada nos dois ambientes", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "producao")).toBeTruthy();
      expect(modeloDe(operacao, "desenvolvimento")).toBeTruthy();
    }
  });

  it("usa apenas variantes :free em desenvolvimento", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "desenvolvimento")).toMatch(/:free$/);
    }
  });

  it("não usa modelo :free em produção", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "producao")).not.toMatch(/:free$/);
    }
  });
});

describe("OPCOES_PROVEDOR", () => {
  it("desliga fallback para que o provedor usado seja o consentido", () => {
    expect(OPCOES_PROVEDOR.openrouter.provider.allow_fallbacks).toBe(false);
  });

  it("exige endpoint compatível com os parâmetros enviados", () => {
    expect(OPCOES_PROVEDOR.openrouter.provider.require_parameters).toBe(true);
  });
});
