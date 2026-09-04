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

type DesfechoObservavel = "ok" | "indisponivel" | "cancelada" | "erro";

function desfechoDoResultado(resultado: unknown): DesfechoObservavel {
  if (!resultado || typeof resultado !== "object") return "ok";
  const valor = resultado as { status?: unknown; cancelada?: unknown; erroInesperado?: unknown };
  if (valor.status !== "indisponivel") return "ok";
  if (valor.cancelada === true) return "cancelada";
  if (valor.erroInesperado === true) return "erro";
  return "indisponivel";
}

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
      const status = desfechoDoResultado(resultado);
      const metricas = { ...atributosComuns, status };
      total.add(1, metricas);
      duracao.record(performance.now() - inicio, metricas);
      span.setAttribute("operation.status", status);
      span.setStatus(status === "ok" || status === "cancelada"
        ? { code: SpanStatusCode.OK }
        : { code: SpanStatusCode.ERROR, message: status });
      logger[status === "ok" ? "info" : status === "cancelada" ? "info" : "warn"](
        { ...atributosComuns, status },
        status === "ok" ? "operação concluída" : status === "cancelada" ? "operação cancelada" : "operação indisponível",
      );
      return resultado;
    } catch (erro) {
      const metricas = { ...atributosComuns, status: "erro" };
      total.add(1, metricas);
      duracao.record(performance.now() - inicio, metricas);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.addEvent("operation.error", {
        "error.type": erro instanceof Error ? erro.constructor.name.slice(0, 80) : typeof erro,
      });
      logger.error({ ...atributosComuns, status: "erro", err: erro }, "operação falhou");
      throw erro;
    } finally {
      span.end();
    }
  });
}
