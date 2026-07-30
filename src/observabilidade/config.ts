const VALORES_ATIVOS = new Set(["1", "true", "sim"]);

/**
 * A telemetria é opt-in para não criar conexões nem ruído em testes e builds.
 * O ambiente local de observabilidade ativa esta variável explicitamente.
 */
export function observabilidadeAtiva(): boolean {
  return VALORES_ATIVOS.has(
    (process.env.OBSERVABILITY_ENABLED ?? "").toLocaleLowerCase(),
  );
}

export function nomeDoServico(): string {
  return process.env.OTEL_SERVICE_NAME || "athlyt";
}

export function ambienteDaAplicacao(): string {
  return process.env.APP_ENV || process.env.NODE_ENV || "development";
}
