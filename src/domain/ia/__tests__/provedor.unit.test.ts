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

  /**
   * Substitui a antiga regra ":free em desenvolvimento". O catálogo
   * gratuito paralelo produziu falhas que só existiam localmente
   * (modelo sem visão, modelo que ignorava o schema): validar contra
   * modelo diferente do de produção testa o ambiente errado.
   */
  it("usa em desenvolvimento o mesmo modelo de produção", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "desenvolvimento")).toBe(
        modeloDe(operacao, "producao"),
      );
    }
  });

  it("não usa modelo :free, que rotaciona sem aviso e ignora schema", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "producao")).not.toMatch(/:free$/);
      expect(modeloDe(operacao, "desenvolvimento")).not.toMatch(/:free$/);
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
