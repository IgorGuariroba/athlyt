import type { Orientacao } from "@/domain/ia/operacoes/copiloto-sessao";

export type EstadoCopilotoCliente =
  | { estado: "inativo" }
  | { estado: "consultando"; requisicao: number; proximaSerie: number }
  | { estado: "orientacao"; requisicao: number; proximaSerie: number; orientacao: Orientacao; versao: string; alertaConfirmado: boolean }
  | { estado: "local"; requisicao: number; proximaSerie: number; motivo: "offline" | "provedor-indisponivel" };

export type EventoCopilotoCliente =
  | { tipo: "serie-registrada"; requisicao: number; proximaSerie: number | null }
  | { tipo: "resposta-recebida"; requisicao: number; proximaSerie: number; orientacao: Orientacao; versao: string }
  | { tipo: "indisponivel"; requisicao: number; proximaSerie: number; motivo: "offline" | "provedor-indisponivel" }
  | { tipo: "cautela-confirmada"; proximaSerie: number };

export const ESTADO_INICIAL_COPILOTO: EstadoCopilotoCliente = { estado: "inativo" };

/**
 * Estado puro da concorrência entre registro e resposta do Copiloto.
 * A identidade da requisição e a série-alvo formam o token de atualidade:
 * resposta fora desse par orientaria o passado e é ignorada.
 */
export function reduzirEstadoCopiloto(
  estado: EstadoCopilotoCliente,
  evento: EventoCopilotoCliente,
): EstadoCopilotoCliente {
  if (evento.tipo === "serie-registrada") {
    return evento.proximaSerie === null
      ? ESTADO_INICIAL_COPILOTO
      : {
          estado: "consultando",
          requisicao: evento.requisicao,
          proximaSerie: evento.proximaSerie,
        };
  }
  if (evento.tipo === "cautela-confirmada") {
    return estado.estado === "orientacao" && estado.proximaSerie === evento.proximaSerie
      ? { ...estado, alertaConfirmado: true }
      : estado;
  }

  if (
    estado.estado === "inativo"
    || estado.requisicao !== evento.requisicao
    || estado.proximaSerie !== evento.proximaSerie
  ) {
    return estado;
  }

  if (evento.tipo === "indisponivel") {
    return {
      estado: "local",
      requisicao: evento.requisicao,
      proximaSerie: evento.proximaSerie,
      motivo: evento.motivo,
    };
  }
  return {
    estado: "orientacao",
    requisicao: evento.requisicao,
    proximaSerie: evento.proximaSerie,
    orientacao: evento.orientacao,
    versao: evento.versao,
    alertaConfirmado: evento.orientacao.alertaCautela === null,
  };
}
