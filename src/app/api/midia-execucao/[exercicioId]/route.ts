import { auth } from "@/auth";
import { configuracaoR2, criarStorageR2 } from "@/infra/storage";
import { midiaDoExercicio as midiaDoExercicioPadrao } from "@/domain/plano/midia-execucao";
import { criarHandlerMidiaExecucao } from "./handler";

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
