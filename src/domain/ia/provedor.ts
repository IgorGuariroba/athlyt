import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { OperacaoIA } from "./contexto/tipos";

/**
 * Conexão com o OpenRouter (ADR 0005).
 *
 * O app conhece nomes lógicos de operação; os mapas abaixo traduzem
 * para modelo concreto. Diferente do gateway self-hosted da ADR 0004,
 * esse mapa vive em código versionado — trocar modelo exige deploy,
 * em troca o histórico da mudança fica no git.
 */

/**
 * Ambientes de modelo. O código exercitado é o mesmo nos dois: muda
 * apenas o catálogo, para que validar localmente não gaste crédito e
 * ainda assim passe pelo caminho real de rede, roteamento e parsing.
 *
 * `desenvolvimento` usa variantes `:free`. Elas são fortemente
 * limitadas por taxa e podem sumir do catálogo sem aviso — servem
 * para validar integração, não para julgar qualidade de resposta.
 */
export type AmbienteIA = "producao" | "desenvolvimento";

const MODELOS_PRODUCAO: Record<OperacaoIA, string> = {
  "copiloto-sessao": "openai/gpt-5-mini",
  "revisao-semanal": "anthropic/claude-sonnet-4.5",
  "plano-inicial": "anthropic/claude-sonnet-4.5",
  "refeicao-texto": "openai/gpt-5-mini",
  "refeicao-foto": "openai/gpt-5-mini",
  "importacao-historico": "anthropic/claude-sonnet-4.5",
};

/**
 * Só entram aqui modelos `:free` com suporte a structured outputs e
 * tool calling — sem isso o `Output.object` do executor falha e o
 * teste local não exercita o caminho de produção.
 */
const MODELOS_DESENVOLVIMENTO: Record<OperacaoIA, string> = {
  "copiloto-sessao": "google/gemini-2.0-flash-exp:free",
  "revisao-semanal": "google/gemini-2.0-flash-exp:free",
  "plano-inicial": "google/gemini-2.0-flash-exp:free",
  "refeicao-texto": "google/gemini-2.0-flash-exp:free",
  // Precisa de visão: manter um modelo multimodal mesmo em dev.
  "refeicao-foto": "google/gemini-2.0-flash-exp:free",
  "importacao-historico": "google/gemini-2.0-flash-exp:free",
};

/**
 * Ambiente de modelos. Explícito por `IA_AMBIENTE` para que rodar
 * `next dev` contra modelos pagos seja uma escolha, não um acidente;
 * o default segue `NODE_ENV` apenas como conveniência.
 */
export function ambienteIA(): AmbienteIA {
  const declarado = process.env.IA_AMBIENTE;
  if (declarado === "producao" || declarado === "desenvolvimento") {
    return declarado;
  }
  return process.env.NODE_ENV === "production"
    ? "producao"
    : "desenvolvimento";
}

export function modeloDe(
  operacao: OperacaoIA,
  ambiente: AmbienteIA = ambienteIA(),
): string {
  const mapa =
    ambiente === "producao" ? MODELOS_PRODUCAO : MODELOS_DESENVOLVIMENTO;
  return mapa[operacao];
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

/** Apenas para testes: descarta o cliente memoizado. */
export function resetarProvedor() {
  cache = null;
}

/**
 * Opções de provedor enviadas ao OpenRouter em toda chamada.
 *
 * `allow_fallbacks: false` é requisito, não otimização (ADR 0005): com
 * fallback ligado o OpenRouter pode servir a requisição por um
 * provedor diferente do consentido, o que tornaria falso o texto de
 * consentimento apresentado ao usuário.
 *
 * `require_parameters: true` restringe o roteamento a endpoints que
 * suportam os parâmetros enviados — sem ele, uma requisição com JSON
 * Schema pode cair num endpoint que ignora `response_format` e
 * devolve texto livre, quebrando a saída estruturada.
 */
export const OPCOES_PROVEDOR = {
  openrouter: {
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
    },
  },
} as const;
