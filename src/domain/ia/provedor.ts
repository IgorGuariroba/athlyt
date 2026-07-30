import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { OperacaoIA } from "./contexto/tipos";

/**
 * Conexão com o OpenRouter (ADR 0005).
 *
 * O app conhece nomes lógicos de operação; o mapa abaixo traduz para
 * modelo concreto. Diferente do gateway self-hosted da ADR 0004, esse
 * mapa vive em código versionado — trocar modelo exige deploy, em
 * troca o histórico da mudança fica no git.
 */

const MODELOS: Record<OperacaoIA, string> = {
  "copiloto-sessao": "openai/gpt-5-mini",
  "revisao-semanal": "anthropic/claude-sonnet-4.5",
  "plano-inicial": "anthropic/claude-sonnet-4.5",
  "refeicao-texto": "openai/gpt-5-mini",
  "refeicao-foto": "openai/gpt-5-mini",
  "importacao-historico": "anthropic/claude-sonnet-4.5",
};

export function modeloDe(operacao: OperacaoIA): string {
  return MODELOS[operacao];
}

/** Nome do provedor exibido no consentimento (user story 106). */
export const NOME_PROVEDOR = "OpenRouter";

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`${nome} não está definida.`);
  }
  return valor;
}

let cache: ReturnType<typeof createOpenAICompatible> | null = null;

export function openrouter() {
  if (!cache) {
    cache = createOpenAICompatible({
      name: "openrouter",
      baseURL: exigirEnv("OPENROUTER_BASE_URL"),
      apiKey: exigirEnv("OPENROUTER_API_KEY"),
    });
  }
  return cache;
}

/**
 * Opções de provedor enviadas ao OpenRouter em toda chamada.
 *
 * `allow_fallbacks: false` é requisito, não otimização (ADR 0005): com
 * fallback ligado o OpenRouter pode servir a requisição por um
 * provedor diferente do consentido, o que tornaria falso o texto de
 * consentimento apresentado ao usuário.
 */
export const OPCOES_PROVEDOR = {
  openrouter: {
    provider: { allow_fallbacks: false },
  },
} as const;
