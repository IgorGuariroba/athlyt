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
 * Só entram aqui modelos `:free` que declaram `structured_outputs` e
 * `tools` em `supported_parameters` — sem isso o `Output.object` do
 * executor falha e o teste local deixa de exercitar o caminho de
 * produção. Em julho/2026 apenas quatro `:free` cumprem o requisito,
 * e só o Gemma 4 26B soma visão, exigida por `refeicao-foto`.
 *
 * Declarar o parâmetro não basta: `openai/gpt-oss-20b:free` anuncia
 * `structured_outputs` mas devolveu prosa em 3 de 3 tentativas, e por
 * isso ficou de fora. Os três abaixo acertaram 3 de 3.
 *
 * O catálogo gratuito rotaciona sem aviso; quando um slug sair do ar,
 * `npm run ia:verificar` falha e a lista se refaz com:
 *   curl -s https://openrouter.ai/api/v1/models \
 *     -H "Authorization: Bearer $OPENROUTER_API_KEY"
 */
const MODELOS_DESENVOLVIMENTO: Record<OperacaoIA, string> = {
  "copiloto-sessao": "nvidia/nemotron-nano-9b-v2:free",
  "revisao-semanal": "nvidia/nemotron-3-super-120b-a12b:free",
  "plano-inicial": "nvidia/nemotron-3-super-120b-a12b:free",
  "refeicao-texto": "nvidia/nemotron-nano-9b-v2:free",
  // Único `:free` com structured outputs e entrada de imagem.
  "refeicao-foto": "google/gemma-4-26b-a4b-it:free",
  "importacao-historico": "nvidia/nemotron-3-super-120b-a12b:free",
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
      // Sem isto o provider assume `false`, descarta o `json_schema` e
      // passa a pedir JSON por instrução no prompt. O modelo responde
      // JSON — mas com os campos que quiser, e a validação Zod falha
      // com "response did not match schema". O OpenRouter suporta
      // structured outputs; quem precisa saber disso é o cliente.
      supportsStructuredOutputs: true,
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
