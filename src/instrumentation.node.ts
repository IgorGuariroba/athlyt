import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
} from "@opentelemetry/semantic-conventions";
import {
  ambienteDaAplicacao,
  nomeDoServico,
  observabilidadeAtiva,
} from "./observabilidade/config";

let sdk: NodeSDK | undefined;

export function iniciarObservabilidade(): void {
  if (!observabilidadeAtiva() || sdk) return;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: nomeDoServico(),
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ambienteDaAplicacao(),
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10_000,
    }),
    instrumentations: [new HttpInstrumentation(), new UndiciInstrumentation()],
  });

  sdk.start();

  const encerrar = () => {
    void sdk?.shutdown();
  };
  process.once("SIGTERM", encerrar);
  process.once("SIGINT", encerrar);
}
