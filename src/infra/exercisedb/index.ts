/**
 * Cliente da ExerciseDB (AscendAPI, tier V1 OSS) — origem da Mídia de
 * Execução: "animação/vídeo demonstrativo do exercício
 * vindo de banco aberto/licenciado". Este cliente só normaliza a API
 * externa; a camada que decide qual exercício do Athlyt usa qual mídia
 * é `src/domain/plano/midia-execucao.ts`.
 *
 * Tier V1 OSS é público e gratuito, sem chave — só GIF 180p. Trocar
 * para o tier pago (V2, RapidAPI, com vídeo MP4) é reescrever este
 * adaptador, não a UI que o consome.
 */

export interface ExercicioExterno {
  exerciseId: string;
  nome: string;
  gifUrl: string;
  musculosAlvo: readonly string[];
  musculosSecundarios: readonly string[];
  equipamentos: readonly string[];
  instrucoes: readonly string[];
}

interface RespostaExercicioBruto {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  equipments?: string[];
  instructions?: string[];
}

interface EnvelopeSucesso<T> {
  success: true;
  data: T;
}

interface EnvelopeErro {
  error: { code: string; message: string };
}

const BASE_URL_PADRAO = "https://oss.exercisedb.dev/api/v1";

/** Remove o prefixo "Step:N " que a API antepõe a cada instrução. */
function normalizarInstrucao(instrucao: string): string {
  return instrucao.replace(/^Step:\d+\s*/, "");
}

function normalizarExercicio(bruto: RespostaExercicioBruto): ExercicioExterno {
  return {
    exerciseId: bruto.exerciseId,
    nome: bruto.name,
    gifUrl: bruto.gifUrl,
    musculosAlvo: bruto.targetMuscles ?? [],
    musculosSecundarios: bruto.secondaryMuscles ?? [],
    equipamentos: bruto.equipments ?? [],
    instrucoes: (bruto.instructions ?? []).map(normalizarInstrucao),
  };
}

export interface ClienteExerciseDB {
  buscar(termo: string, limite?: number): Promise<ExercicioExterno[]>;
  porId(id: string): Promise<ExercicioExterno | null>;
}

export function criarClienteExerciseDB(opcoes?: {
  baseUrl?: string;
  fetch?: typeof fetch;
}): ClienteExerciseDB {
  const baseUrl = opcoes?.baseUrl ?? process.env.EXERCISEDB_BASE_URL ?? BASE_URL_PADRAO;
  const fetchImpl = opcoes?.fetch ?? fetch;

  async function requisitar<T>(caminho: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${baseUrl}${caminho}`);
    for (const [chave, valor] of Object.entries(params ?? {})) url.searchParams.set(chave, valor);

    const resposta = await fetchImpl(url);
    const corpo = (await resposta.json()) as EnvelopeSucesso<T> | EnvelopeErro;

    if (!resposta.ok || "error" in corpo) {
      const erro = "error" in corpo ? corpo.error : { code: "DESCONHECIDO", message: resposta.statusText };
      throw Object.assign(new Error(`ExerciseDB: ${erro.code} — ${erro.message}`), { codigo: erro.code });
    }

    return corpo.data;
  }

  return {
    async buscar(termo, limite = 10) {
      // A busca usa o parâmetro `search`, não `q` — `?q=` é aceito
      // silenciosamente e devolve `data: []`, sem erro algum.
      const dados = await requisitar<RespostaExercicioBruto[]>("/exercises/search", {
        search: termo,
        limit: String(limite),
      });
      return dados.map(normalizarExercicio);
    },

    async porId(id) {
      try {
        const dado = await requisitar<RespostaExercicioBruto>(`/exercises/${id}`);
        return normalizarExercicio(dado);
      } catch (erro) {
        if ((erro as { codigo?: string }).codigo === "NOT_FOUND") return null;
        throw erro;
      }
    },
  };
}
