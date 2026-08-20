import { auth } from "@/auth";
import { configuracaoR2, criarStorageR2, type StoragePrivado } from "@/infra/storage";
import { midiaDoExercicio as midiaDoExercicioPadrao, type MidiaExecucao } from "@/domain/plano/midia-execucao";

/**
 * Serve o GIF espelhado no R2 da Mídia de Execução (CONTEXT.md), por
 * uma rota same-origin — não por URL assinada — para caber de forma
 * estável no cache do service worker (ver `src/app/sw.ts`).
 *
 * Falha fechada em qualquer ausência (sem mapeamento, sem R2, objeto
 * inexistente): 404, nunca 500. A ficha do exercício sempre tem o
 * fallback em texto; uma rota barulhenta aqui não pode quebrar a
 * Sessão de Treino.
 */

interface DependenciasHandler {
  autenticado(): Promise<boolean>;
  midiaDoExercicio(exercicioId: string): MidiaExecucao | undefined;
  obterStorage(): StoragePrivado | null;
}

export function criarHandlerMidiaExecucao(deps: DependenciasHandler) {
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
      // `corpo` vem tipado como Uint8Array<ArrayBufferLike> (retorno do SDK
      // da AWS); Response aceita o buffer bruto em runtime, mas o tipo do
      // BodyInit exige um ArrayBuffer concreto — dai o cast explicito.
      return new Response(corpo.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "content-type": contentType,
          "cache-control": "private, max-age=604800, immutable",
        },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  };
}

const handlerPadrao = criarHandlerMidiaExecucao({
  async autenticado() {
    const session = await auth();
    return Boolean(session?.user?.id);
  },
  midiaDoExercicio: midiaDoExercicioPadrao,
  obterStorage() {
    const config = configuracaoR2();
    return config ? criarStorageR2(config) : null;
  },
});

export async function GET(_request: Request, { params }: { params: Promise<{ exercicioId: string }> }): Promise<Response> {
  const { exercicioId } = await params;
  return handlerPadrao(exercicioId);
}
