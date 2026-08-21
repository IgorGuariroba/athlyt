export const TIMEOUT_GERACAO_IA_MS = Number(process.env.IA_TIMEOUT_MS ?? 240_000);

export function executarComTimeout<T>(operacao: (signal: AbortSignal) => Promise<T>, timeoutMs = TIMEOUT_GERACAO_IA_MS): Promise<T> {
  const controlador = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controlador.abort();
      reject(new Error(`Timeout da geração de IA após ${timeoutMs} ms`));
    }, timeoutMs);
    operacao(controlador.signal).then(
      (valor) => { clearTimeout(timer); resolve(valor); },
      (erro) => { clearTimeout(timer); reject(erro); },
    );
  });
}
