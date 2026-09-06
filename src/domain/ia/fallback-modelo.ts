export interface RotaModeloAprovada {
  modelo: string;
  endpoint: string;
}

export interface TentativaModelo {
  ordem: number;
  rota: RotaModeloAprovada;
  chamadas: number;
  desfecho: "ok" | "limite-taxa" | "timeout" | "resposta-vazia" | "indisponibilidade-externa" | "saida-invalida" | "cancelada" | "erro";
}

export type ResultadoChamadaRota<T> =
  | { tipo: "sucesso"; valor: T; modeloResolvido: string }
  | { tipo: TentativaModelo["desfecho"]; retryable?: boolean; motivo: string };

export type ResultadoFallback<T> =
  | { status: "ok"; valor: T; modeloResolvido: string; rotaResolvida: RotaModeloAprovada; tentativas: TentativaModelo[] }
  | { status: "indisponivel"; motivo: string; tentativas: TentativaModelo[] }
  | { status: "cancelada"; tentativas: TentativaModelo[] }
  | { status: "erro"; motivo: string; tentativas: TentativaModelo[] };

export type EventoProgressoFallback =
  | { tipo: "inicio"; total: number }
  | { tipo: "alternativa"; tentativa: number; total: number }
  | { tipo: "ultima-alternativa"; tentativa: number; total: number };

const DESFECHOS_QUE_AVANCAM = new Set<TentativaModelo["desfecho"]>([
  "limite-taxa", "timeout", "resposta-vazia", "indisponibilidade-externa",
]);

/** Executor da cadeia: dois chamados por rota, prazo compartilhado por rota e global. */
function abortado(signal: AbortSignal): boolean {
  // A propriedade `aborted` de um `AbortSignal` muda de forma assíncrona
  // entre awaits. Uma função evita que a checagem anterior afine a
  // variável local para `false` perpétuo no fluxo de controle estático.
  return signal.aborted;
}

export async function executarFallbackDeModelo<T>(entrada: {
  rotas: readonly RotaModeloAprovada[];
  executar: (rota: RotaModeloAprovada, contexto: { chamada: number; signal: AbortSignal }) => Promise<ResultadoChamadaRota<T>>;
  signal?: AbortSignal;
  aoProgresso?: (evento: EventoProgressoFallback) => void;
  orcamentoRotaMs?: number;
  orcamentoTotalMs?: number;
}): Promise<ResultadoFallback<T>> {
  const tentativas: TentativaModelo[] = [];
  const externo = entrada.signal ?? new AbortController().signal;
  if (abortado(externo)) return { status: "cancelada", tentativas };

  const global = new AbortController();
  const timerGlobal = setTimeout(() => {
    global.abort("orcamento-global");
  }, entrada.orcamentoTotalMs ?? 360_000);
  const signalGlobal = AbortSignal.any([externo, global.signal]);
  entrada.aoProgresso?.({ tipo: "inicio", total: entrada.rotas.length });

  try {
    for (const [indice, rota] of entrada.rotas.entries()) {
      if (abortado(global.signal)) {
        return { status: "indisponivel", motivo: "Orçamento global da decisão esgotado.", tentativas };
      }
      if (abortado(externo)) return { status: "cancelada", tentativas };
      if (indice > 0) {
        entrada.aoProgresso?.({
          tipo: indice === entrada.rotas.length - 1 ? "ultima-alternativa" : "alternativa",
          tentativa: indice + 1,
          total: entrada.rotas.length,
        });
      }

      const controladorRota = new AbortController();
      const timerRota = setTimeout(() => {
        controladorRota.abort("orcamento-rota");
      }, entrada.orcamentoRotaMs ?? 120_000);
      const signalRota = AbortSignal.any([signalGlobal, controladorRota.signal]);
      let resultado: ResultadoChamadaRota<T> | undefined;
      let chamadas = 0;

      try {
        for (let chamada = 1; chamada <= 2; chamada += 1) {
          chamadas = chamada;
          try {
            resultado = await entrada.executar(rota, { chamada, signal: signalRota });
          } catch (erro) {
            if (abortado(externo)) {
              tentativas.push({ ordem: indice + 1, rota, chamadas, desfecho: "cancelada" });
              return { status: "cancelada", tentativas };
            }
            if (abortado(global.signal)) {
              tentativas.push({ ordem: indice + 1, rota, chamadas, desfecho: "timeout" });
              return { status: "indisponivel", motivo: "Orçamento global da decisão esgotado.", tentativas };
            }
            if (controladorRota.signal.aborted) {
              resultado = { tipo: "timeout", motivo: "Tempo da rota esgotado.", retryable: true };
              break;
            }
            if (erro instanceof Error && erro.name === "AbortError") {
              tentativas.push({ ordem: indice + 1, rota, chamadas, desfecho: "cancelada" });
              return { status: "cancelada", tentativas };
            }
            resultado = { tipo: "erro", motivo: "Erro inesperado na rota." };
          }

          if (resultado.tipo === "sucesso") {
            tentativas.push({ ordem: indice + 1, rota, chamadas, desfecho: "ok" });
            return { status: "ok", valor: resultado.valor, modeloResolvido: resultado.modeloResolvido, rotaResolvida: rota, tentativas };
          }
          if (!resultado.retryable) break;
        }
      } finally {
        clearTimeout(timerRota);
      }

      if (!resultado || resultado.tipo === "sucesso") continue;
      tentativas.push({ ordem: indice + 1, rota, chamadas, desfecho: resultado.tipo });
      if (!DESFECHOS_QUE_AVANCAM.has(resultado.tipo)) {
        return resultado.tipo === "erro"
          ? { status: "erro", motivo: resultado.motivo, tentativas }
          : { status: "indisponivel", motivo: resultado.motivo, tentativas };
      }
    }

    return { status: "indisponivel", motivo: "Todas as rotas aprovadas estão indisponíveis.", tentativas };
  } finally {
    clearTimeout(timerGlobal);
  }
}
