import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { iniciarObservabilidade } = await import("./instrumentation.node");
  iniciarObservabilidade();
}

/** Captura erros não tratados pelo ciclo de requisição do App Router. */
export const onRequestError: Instrumentation.onRequestError = async (
  erro,
  requisicao,
  contexto,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("./observabilidade/logger");
  logger.error(
    {
      err: erro,
      method: requisicao.method,
      routeType: contexto.routeType,
      routePath: contexto.routePath,
      routerKind: contexto.routerKind,
    },
    "erro não tratado em requisição",
  );
};
