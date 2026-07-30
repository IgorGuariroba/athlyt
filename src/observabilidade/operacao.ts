import {
  SpanStatusCode,
  metrics,
  trace,
  type Attributes,
} from "@opentelemetry/api";
import { nomeDoServico, observabilidadeAtiva } from "./config";
import { logger } from "./logger";

const tracer = trace.getTracer(nomeDoServico());
const meter = metrics.getMeter(nomeDoServico());
const duracao = meter.createHistogram("athlyt.operacao.duracao", {
  description: "Duração das operações de aplicação",
  unit: "ms",
});
const total = meter.createCounter("athlyt.operacao.total", {
  description: "Quantidade de operações concluídas",
});

function atributosSeguros(
  nome: string,
  atributos: Attributes,
): Attributes {
  return { "operation.name": nome, ...atributos };
}

/** Instrumenta uma fronteira de negócio sem registrar entradas ou saídas sensíveis. */
export async function observarOperacao<T>(
  nome: string,
  atributos: Attributes,
  executar: () => Promise<T>,
): Promise<T> {
  if (!observabilidadeAtiva()) return executar();

  const atributosComuns = atributosSeguros(nome, atributos);
  const inicio = performance.now();

  return tracer.startActiveSpan(nome, { attributes: atributosComuns }, async (span) => {
    try {
      const resultado = await executar();
      const metricas = { ...atributosComuns, status: "ok" };
      total.add(1, metricas);
      duracao.record(performance.now() - inicio, metricas);
      span.setStatus({ code: SpanStatusCode.OK });
      logger.info(atributosComuns, "operação concluída");
      return resultado;
    } catch (erro) {
      const metricas = { ...atributosComuns, status: "erro" };
      total.add(1, metricas);
      duracao.record(performance.now() - inicio, metricas);
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (erro instanceof Error) span.recordException(erro);
      logger.error({ ...atributosComuns, err: erro }, "operação falhou");
      throw erro;
    } finally {
      span.end();
    }
  });
}
