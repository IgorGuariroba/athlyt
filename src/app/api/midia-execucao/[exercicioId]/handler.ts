import type { StoragePrivado } from "@/infra/storage";
import type { MidiaExecucao } from "@/domain/plano/midia-execucao";

export interface DependenciasHandlerMidia {
  autenticado(): Promise<boolean>;
  midiaDoExercicio(exercicioId: string): MidiaExecucao | undefined;
  obterStorage(): StoragePrivado | null;
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
      // `corpo` vem tipado como Uint8Array<ArrayBufferLike> (retorno do SDK
      // da AWS); Response aceita o buffer bruto em runtime, mas o tipo do
      // BodyInit exige um ArrayBuffer concreto — daí o cast explícito.
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
