import { trace, SpanStatusCode } from "@opentelemetry/api";
import type postgres from "postgres";
import { observabilidadeAtiva } from "./config";

const tracer = trace.getTracer("athlyt.postgres");

/** Instrumenta a execução lazy usada pelo Drizzle, sem ler SQL, parâmetros ou linhas. */
function observarQuery<T extends object>(query: T): T {
  return new Proxy(query, {
    get(target, property, receiver): unknown {
      const value: unknown = Reflect.get(target, property, receiver);
      if (property === "then" && typeof value === "function") {
        return (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) =>
          tracer.startActiveSpan("database.query", { attributes: { "db.system.name": "postgresql" } }, (span) => {
            return Reflect.apply(value, target, [
              (result: unknown) => { span.end(); return resolve(result); },
              (error: unknown) => {
                span.setStatus({ code: SpanStatusCode.ERROR });
                span.setAttribute("error.type", error instanceof Error ? error.name : "UnknownError");
                span.end();
                return reject(error);
              },
            ]) as unknown;
          });
      }
      if (property === "values" && typeof value === "function") {
        return (...args: unknown[]) => observarQuery(Reflect.apply(value, target, args) as object);
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function instrumentarPostgres<T extends postgres.Sql>(client: T): T {
  if (!observabilidadeAtiva()) return client;
  return new Proxy(client, {
    get(target, property, receiver): unknown {
      const value: unknown = Reflect.get(target, property, receiver);
      if (property === "unsafe" && typeof value === "function") {
        return (...args: unknown[]) => observarQuery(Reflect.apply(value, target, args) as object);
      }
      if (property === "begin" && typeof value === "function") {
        return (...args: unknown[]) => Reflect.apply(value, target, args.map(arg =>
          typeof arg === "function" ? (transaction: T) => Reflect.apply(arg, undefined, [instrumentarPostgres(transaction)]) as unknown : arg,
        )) as unknown;
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
