import { describe, expect, it } from "vitest";
import { reduzirEstadoCopiloto, type EstadoCopilotoCliente } from "../copiloto-cliente";

const orientacao = {
  cargaSugeridaKg: 26,
  repeticoesAlvo: 9,
  rirAlvo: 2,
  descansoSegundos: 90,
  justificativa: "A série anterior ficou no alvo.",
  alertaCautela: null,
};

describe("orquestrador cliente do Copiloto", () => {
  it("descarta uma resposta que chegou depois de a série seguinte começar", () => {
    const aguardando: EstadoCopilotoCliente = {
      estado: "consultando",
      requisicao: 1,
      proximaSerie: 2,
    };
    const avancado = reduzirEstadoCopiloto(aguardando, {
      tipo: "serie-registrada",
      requisicao: 2,
      proximaSerie: 3,
    });

    const final = reduzirEstadoCopiloto(avancado, {
      tipo: "resposta-recebida",
      requisicao: 1,
      orientacao,
      versao: "modelo-v1",
      proximaSerie: 2,
    });

    expect(final).toEqual(avancado);
  });

  it("invalida a orientação pendente quando a última série começa", () => {
    const aguardando: EstadoCopilotoCliente = { estado: "consultando", requisicao: 7, proximaSerie: 3 };
    const invalidado = reduzirEstadoCopiloto(aguardando, {
      tipo: "serie-registrada",
      requisicao: 8,
      proximaSerie: null,
    });

    expect(invalidado).toEqual({ estado: "inativo" });
  });

  it("mantém o Alerta de Cautela pendente até o override explícito", () => {
    const recebido = reduzirEstadoCopiloto({ estado: "consultando", requisicao: 3, proximaSerie: 2 }, {
      tipo: "resposta-recebida",
      requisicao: 3,
      proximaSerie: 2,
      orientacao: { ...orientacao, alertaCautela: "Fadiga alta relatada." },
      versao: "modelo-v1",
    });
    expect(recebido).toEqual(expect.objectContaining({ alertaConfirmado: false }));

    expect(reduzirEstadoCopiloto(recebido, { tipo: "cautela-confirmada", proximaSerie: 2 }))
      .toEqual(expect.objectContaining({ alertaConfirmado: true }));
  });

  it("degrada explicitamente para regra local quando o provedor fica indisponível", () => {
    const aguardando: EstadoCopilotoCliente = {
      estado: "consultando",
      requisicao: 4,
      proximaSerie: 2,
    };

    expect(reduzirEstadoCopiloto(aguardando, {
      tipo: "indisponivel",
      requisicao: 4,
      proximaSerie: 2,
      motivo: "provedor-indisponivel",
    })).toEqual({
      estado: "local",
      requisicao: 4,
      proximaSerie: 2,
      motivo: "provedor-indisponivel",
    });
  });
});
