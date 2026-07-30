import { context, trace } from "@opentelemetry/api";
import pino from "pino";
import {
  ambienteDaAplicacao,
  nomeDoServico,
  observabilidadeAtiva,
} from "./config";

const nivel = process.env.LOG_LEVEL || "info";

/**
 * Logger estruturado único do servidor. Nunca passe objetos de domínio inteiros:
 * atributos devem ser identificadores técnicos de baixa cardinalidade e sem PII.
 */
export const logger = pino({
  level: nivel,
  base: {
    service: nomeDoServico(),
    environment: ambienteDaAplicacao(),
  },
  redact: {
    paths: [
      "password",
      "senha",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.senha",
      "*.token",
      "*.authorization",
      "*.cookie",
      "*.userId",
      "userId",
    ],
    censor: "[REDACTED]",
  },
  mixin() {
    if (!observabilidadeAtiva()) return {};

    const spanContext = trace.getSpan(context.active())?.spanContext();
    if (!spanContext) return {};

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  },
});

export type AtributosDeLog = Record<
  string,
  string | number | boolean | null | undefined
>;
