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

/**
 * Modelo base do agent Athlyt.
 *
 * Multimodal (`text+image+file+audio+video`), com `structured_outputs`
 * e `tools` — os dois requisitos do executor `decidir()` — e 1M de
 * contexto. Ser multimodal em todas as operações evita a classe de
 * falha que já ocorreu: um Recorte passar a enviar imagem e o modelo
 * daquela operação ser só de texto.
 */
const MODELO_BASE = "google/gemini-2.5-flash-lite";

/**
 * O Gemini rejeita o schema do plano. O Luna aceita, custa menos que o
 * GPT-5 Mini e mantém `structured_outputs`, `tools` e entrada multimodal
 * — as fotos corporais vão nas duas operações do plano.
 */
const MODELO_PLANO = "openai/gpt-5.6-luna";

const MODELOS_PRODUCAO: Record<OperacaoIA, string> = {
  "copiloto-sessao": MODELO_BASE,
  "revisao-semanal": MODELO_BASE,
  "plano-treino": MODELO_PLANO,
  "plano-nutricao": MODELO_PLANO,
  "refeicao-texto": MODELO_BASE,
  "refeicao-foto": MODELO_BASE,
  "avaliacao-visual": MODELO_BASE,
  "importacao-historico": MODELO_BASE,
};

/**
 * Desenvolvimento usa o mesmo modelo base de produção.
 *
 * Antes o ambiente local rodava um catálogo `:free` paralelo, e isso
 * custou duas falhas que só apareciam localmente: um modelo sem visão
 * numa operação que passou a enviar fotos, e outro que ignorava o
 * schema e devolvia prosa. Validar contra modelo diferente do que
 * roda em produção testa o ambiente errado.
 *
 * O Flash-Lite custa ~US$ 0,10/MTok de entrada, então a economia que
 * justificava o catálogo `:free` deixou de compensar o risco. A
 * separação de ambientes permanece para que trocar apenas o modelo
 * de dev volte a ser possível sem mexer em produção.
 *
 * `npm run ia:modalidades` confere que cada modelo suporta as
 * modalidades que o Recorte da operação envia.
 */
const MODELOS_DESENVOLVIMENTO: Record<OperacaoIA, string> = {
  ...MODELOS_PRODUCAO,
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
    /**
     * O Luna raciocina em `medium` por padrão, e cada token de raciocínio
     * atrasa o primeiro token da resposta. As decisões do Athlyt são
     * guiadas por schema e por âncoras declaradas, não por deliberação
     * longa do modelo — `low` troca um esforço que não usávamos por
     * latência menor.
     */
    reasoning: { effort: "low" },
  },
} as const;
