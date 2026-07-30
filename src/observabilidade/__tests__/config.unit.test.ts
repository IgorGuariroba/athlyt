import { afterEach, describe, expect, it } from "vitest";
import {
  ambienteDaAplicacao,
  nomeDoServico,
  observabilidadeAtiva,
} from "../config";

const ambienteOriginal = { ...process.env };

afterEach(() => {
  process.env = { ...ambienteOriginal };
});

describe("configuração de observabilidade", () => {
  it.each(["true", "1", "sim", "TRUE"])("ativa com %s", (valor) => {
    process.env.OBSERVABILITY_ENABLED = valor;
    expect(observabilidadeAtiva()).toBe(true);
  });

  it("permanece desativada por padrão", () => {
    delete process.env.OBSERVABILITY_ENABLED;
    expect(observabilidadeAtiva()).toBe(false);
  });

  it("usa nomes seguros como padrão", () => {
    delete process.env.OTEL_SERVICE_NAME;
    process.env.APP_ENV = "test";

    expect(nomeDoServico()).toBe("athlyt");
    expect(ambienteDaAplicacao()).toBe("test");
  });
});
