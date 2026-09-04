import { context, trace } from "@opentelemetry/api";
import pino, { type DestinationStream } from "pino";
import {
  ambienteDaAplicacao,
  nomeDoServico,
  observabilidadeAtiva,
} from "./config";

const nivel = process.env.LOG_LEVEL || "info";

/**
 * Defesa central: erros de SDK são objetos extensíveis e podem carregar
 * request/response, anexos, prompts, causas e AggregateErrors. A exceção
 * atravessa uma allowlist, nunca o serializer padrão do Pino.
 */
function serializarExcecao(erro: unknown): { tipo: string } {
  if (erro && typeof erro === "object" && "tipo" in erro && typeof erro.tipo === "string") {
    return { tipo: erro.tipo.slice(0, 80) };
  }
  return {
    tipo: erro instanceof Error
      ? erro.constructor.name.slice(0, 80)
      : typeof erro,
  };
}

const CHAVES_SENSIVEIS = new Set([
  "requestbody", "responsebody", "messages", "attachments", "anexos", "data",
  "prompt", "perfil", "profile", "headers", "cookie", "authorization", "token",
  "userid", "userid", "user", "usuario",
]);

function sanitizar(valor: unknown, profundidade = 0, vistos = new WeakSet<object>()): unknown {
  if (valor instanceof Error) return serializarExcecao(valor);
  if (typeof valor === "string") return valor.length > 1_024 ? `${valor.slice(0, 1_024)}[TRUNCATED]` : valor;
  if (valor === null || typeof valor !== "object") return valor;
  if (profundidade >= 5 || vistos.has(valor)) return "[TRUNCATED]";
  vistos.add(valor);
  if (Array.isArray(valor)) return valor.slice(0, 20).map((item) => sanitizar(item, profundidade + 1, vistos));

  return Object.fromEntries(Object.entries(valor).slice(0, 50).map(([chave, item]) => [
    chave,
    CHAVES_SENSIVEIS.has(chave.toLowerCase()) ? "[REDACTED]" : sanitizar(item, profundidade + 1, vistos),
  ]));
}

function opcoesLogger(): pino.LoggerOptions {
  return {
    level: nivel,
    base: {
      service: nomeDoServico(),
      environment: ambienteDaAplicacao(),
    },
    serializers: { err: serializarExcecao, error: serializarExcecao },
    formatters: {
      log(objeto) {
        return sanitizar(objeto) as Record<string, unknown>;
      },
    },
    redact: {
      paths: [
        "password", "senha", "token", "authorization", "cookie", "userId",
        "*.password", "*.senha", "*.token", "*.authorization", "*.cookie", "*.userId",
      ],
      censor: "[REDACTED]",
    },
    mixin() {
      if (!observabilidadeAtiva()) return {};
      const spanContext = trace.getSpan(context.active())?.spanContext();
      if (!spanContext) return {};
      return { traceId: spanContext.traceId, spanId: spanContext.spanId };
    },
  };
}

/** Fábrica pública usada para provar o JSON realmente emitido. */
export function criarLogger(destino?: DestinationStream) {
  return destino ? pino(opcoesLogger(), destino) : pino(opcoesLogger());
}

/** Logger estruturado único do servidor. */
export const logger = criarLogger();

export type AtributosDeLog = Record<
  string,
  string | number | boolean | null | undefined
>;
