/** Modalidades que determinam como uma série deve ser registrada. */
export type ModalidadeProtocolo =
  | "repeticoes"
  | "tempo"
  | "distancia"
  | "duracao"
  | "calorias"
  | "ritmo"
  | "unilateral"
  | "circuito";

export interface ProtocoloExecucao {
  modalidade: ModalidadeProtocolo;
  unidade: "repeticoes" | "segundos" | "metros" | "minutos" | "kcal" | "pace" | "lados" | "rodadas";
  alvo: string;
  exigeCarga: boolean;
  exigeRir: boolean;
}

export interface EntradaProtocoloExecucao {
  exercicioId: string;
  repeticoes?: string;
  cargaKg?: boolean;
  modalidade?: ModalidadeProtocolo;
}

/**
 * Resolve o protocolo de registro sem acoplar a tela ao nome do exercício.
 * O catálogo poderá fornecer a modalidade explicitamente; enquanto essa
 * migração não acontece, os casos conhecidos usam uma regra compatível.
 */
export function criarProtocoloExecucao(entrada: EntradaProtocoloExecucao): ProtocoloExecucao {
  const modalidade = entrada.modalidade ?? (entrada.exercicioId === "prancha" ? "tempo" : "repeticoes");
  const configuracoes: Record<ModalidadeProtocolo, { unidade: ProtocoloExecucao["unidade"]; exigeCarga: boolean; exigeRir: boolean }> = {
    repeticoes: { unidade: "repeticoes", exigeCarga: entrada.cargaKg ?? true, exigeRir: true },
    tempo: { unidade: "segundos", exigeCarga: false, exigeRir: false },
    distancia: { unidade: "metros", exigeCarga: false, exigeRir: false },
    duracao: { unidade: "minutos", exigeCarga: false, exigeRir: false },
    calorias: { unidade: "kcal", exigeCarga: false, exigeRir: false },
    ritmo: { unidade: "pace", exigeCarga: false, exigeRir: false },
    unilateral: { unidade: "lados", exigeCarga: entrada.cargaKg ?? true, exigeRir: true },
    circuito: { unidade: "rodadas", exigeCarga: false, exigeRir: false },
  };
  const configuracao = configuracoes[modalidade];
  return {
    modalidade,
    unidade: configuracao.unidade,
    alvo: entrada.repeticoes ?? "",
    exigeCarga: configuracao.exigeCarga,
    exigeRir: configuracao.exigeRir,
  };

}
