import type { StoragePrivado } from "@/infra/storage";
import type { MidiaExecucao } from "@/domain/plano/midia-execucao";

export interface DependenciasHandlerMidia {
  autenticado(): Promise<boolean>;
  midiaDoExercicio(exercicioId: string): MidiaExecucao | undefined;
  obterStorage(): StoragePrivado | null;
  /**
   * Baixa o GIF de origem na ExerciseDB. `null` = origem indisponível
   * ou resposta inválida; o handler cai para 404 e a ficha usa o
   * fallback em texto.
   */
  baixarGifDeOrigem(exerciseId: string): Promise<Uint8Array | null>;
}

const URL_MIDIA_ORIGEM = "https://static.exercisedb.dev/media";

/**
 * Baixa o GIF da ExerciseDB para espelhamento. Valida content-type e
 * corpo não-vazio pelas mesmas regras de
 * `scripts/importar-midia-exercicios.ts --espelhar`: um HTML de erro
 * gravado no R2 com chave imutável envenenaria o cache do service
 * worker por 30 dias (`src/app/sw.ts`).
 */
export async function baixarGifDaExerciseDB(exerciseId: string): Promise<Uint8Array | null> {
  try {
    const resposta = await fetch(`${URL_MIDIA_ORIGEM}/${exerciseId}.gif`);
    if (!resposta.ok) return null;
    if (!(resposta.headers.get("content-type") ?? "").startsWith("image/gif")) return null;

    const corpo = new Uint8Array(await resposta.arrayBuffer());
    return corpo.byteLength > 0 ? corpo : null;
  } catch {
    return null;
  }
}

function respostaComGif(corpo: Uint8Array): Response {
  // `corpo` vem tipado como Uint8Array<ArrayBufferLike> (retorno do SDK
  // da AWS); Response aceita o buffer bruto em runtime, mas o tipo do
  // BodyInit exige um ArrayBuffer concreto — daí o cast explícito.
  return new Response(corpo.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "cache-control": "private, max-age=604800, immutable",
    },
  });
}

export function criarHandlerMidiaExecucao(deps: DependenciasHandlerMidia) {
  return async function handler(exercicioId: string): Promise<Response> {
    if (!(await deps.autenticado())) {
      return Response.json({ erro: "Não autenticado" }, { status: 401 });
    }

    const midia = deps.midiaDoExercicio(exercicioId);
    if (!midia) return new Response(null, { status: 404 });

    const storage = deps.obterStorage();
    if (!storage) return new Response(null, { status: 404 });

    try {
      const { corpo, contentType } = await storage.ler(midia.chaveObjeto);
      return new Response(corpo.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "content-type": contentType,
          "cache-control": "private, max-age=604800, immutable",
        },
      });
    } catch {
      // Objeto ausente no bucket. Antes esta era a morte silenciosa da
      // Mídia de Execução: o espelhamento é um passo manual
      // (`npm run midia:importar -- --espelhar`) fora do deploy, então
      // um bucket novo — ou populado apontando para o bucket de testes
      // — degradava toda ficha para o diagrama, sem sinal algum. O
      // mapa curado já diz qual GIF é o correto para este exercício;
      // buscá-lo aqui é o mesmo trabalho do script, no momento em que
      // a falta é descoberta.
      return await espelharSobDemanda(deps, storage, midia);
    }
  };
}

/**
 * Espelha o GIF na primeira leitura que der miss e serve o resultado.
 * Continua falhando fechada: origem fora do ar devolve 404 e a ficha
 * mostra o fallback em texto, como antes.
 */
async function espelharSobDemanda(
  deps: DependenciasHandlerMidia,
  storage: StoragePrivado,
  midia: MidiaExecucao,
): Promise<Response> {
  const corpo = await deps.baixarGifDeOrigem(midia.exerciseId);
  if (!corpo) return new Response(null, { status: 404 });

  try {
    await storage.gravar({ chave: midia.chaveObjeto, corpo, contentType: "image/gif" });
  } catch {
    // Gravação é otimização de cache, não requisito da resposta: uma
    // credencial R2 sem permissão de escrita ainda deve entregar a
    // animação que já está em mãos, mesmo que a próxima requisição
    // precise baixá-la de novo.
  }

  return respostaComGif(corpo);
}
