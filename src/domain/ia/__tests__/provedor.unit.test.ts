import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ambienteIA,
  modeloDe,
  OPCOES_PROVEDOR,
  ROTAS_REFEICAO_FOTO,
  opcoesDaRota,
} from "../provedor";
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

  it("usa o Luna somente nas operações do plano", () => {
    expect(modeloDe("plano-treino", "producao")).toBe("openai/gpt-5.6-luna");
    expect(modeloDe("plano-nutricao", "producao")).toBe("openai/gpt-5.6-luna");
    expect(modeloDe("plano-treino", "desenvolvimento")).toBe("openai/gpt-5.6-luna");
    expect(modeloDe("copiloto-sessao", "producao")).toBe(
      "google/gemini-2.5-flash-lite",
    );
  });

  it("não usa modelo :free, que rotaciona sem aviso e ignora schema", () => {
    for (const operacao of OPERACOES) {
      expect(modeloDe(operacao, "producao")).not.toMatch(/:free$/);
      expect(modeloDe(operacao, "desenvolvimento")).not.toMatch(/:free$/);
    }
  });
});

describe("Fallback de Modelo Controlado da Refeição por Foto", () => {
  it("mantém cadeia fixa, ordenada e com endpoint pinado", () => {
    expect(ROTAS_REFEICAO_FOTO).toEqual([
      { modelo: "google/gemini-2.5-flash-lite", endpoint: "google-vertex/eu" },
      { modelo: "openai/gpt-5.6-luna", endpoint: "openai" },
      { modelo: "z-ai/glm-5.3-flash", endpoint: "z-ai/fp8" },
    ]);

    for (const rota of ROTAS_REFEICAO_FOTO) {
      expect(opcoesDaRota(rota).openrouter.provider).toMatchObject({
        order: [rota.endpoint],
        only: [rota.endpoint],
        allow_fallbacks: false,
        require_parameters: true,
      });
      expect(opcoesDaRota(rota).openrouter).toMatchObject({
        reasoning: { effort: "low" },
      });
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
