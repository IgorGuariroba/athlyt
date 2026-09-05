export const TIMEOUT_GERACAO_IA_MS = Number(process.env.IA_TIMEOUT_MS ?? 240_000);

export function executarComTimeout<T>(
  operacao: (signal: AbortSignal) => Promise<T>,
  timeoutMs = TIMEOUT_GERACAO_IA_MS,
  signalExterno?: AbortSignal,
): Promise<T> {
  const controlador = new AbortController();
  return new Promise<T>((resolve, reject) => {
    let encerrada = false;
    const limpar = () => {
      clearTimeout(timer);
      signalExterno?.removeEventListener("abort", cancelar);
    };
    const concluir = (acao: () => void) => {
      if (encerrada) return;
      encerrada = true;
      limpar();
      acao();
    };
    const cancelar = () => {
      controlador.abort(signalExterno?.reason);
      concluir(() => {
        reject(new DOMException("Operação cancelada.", "AbortError"));
      });
    };
    const timer = setTimeout(() => {
      controlador.abort();
      concluir(() => {
        reject(new Error(`Timeout da geração de IA após ${timeoutMs} ms`));
      });
    }, timeoutMs);

    if (signalExterno?.aborted) {
      cancelar();
      return;
    }
    signalExterno?.addEventListener("abort", cancelar, { once: true });
    operacao(controlador.signal).then(
      (valor) => {
        concluir(() => {
          resolve(valor);
        });
      },
      (erro: unknown) => {
        concluir(() => {
          reject(erro instanceof Error ? erro : new Error(String(erro)));
        });
      },
    );
  });
}
