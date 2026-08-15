import type { ExplicacaoDecisao } from "@/domain/plano/tipos";

export interface Macros {
  calorias: number;
  proteinaG: number;
  carboidratosG: number;
  gordurasG: number;
  fibrasG: number;
}

export interface ItemAlimentar extends Macros {
  descricao: string;
}

/**
 * Refeição do Cardápio Diário materializada na linha do tempo
 * (CONTEXT.md > Entrada Planejada). Enquanto não houver Consumo
 * Confirmado correspondente, é apenas prescrição — nada dela conta
 * nos macros consumidos.
 */
export interface EntradaPlanejada {
  refeicaoRef: string;
  nome: string;
  horaLocal: string;
  itens: ItemAlimentar[];
  macros: Macros;
  /**
   * Por que esta refeição foi prescrita para este atleta. Vem do Plano
   * Ativo e acompanha a entrada porque é no Diário, diante do prato,
   * que a pergunta aparece — não na revisão do plano.
   *
   * Opcional porque planos anteriores a esta fatia continuam válidos.
   */
  explicacao?: ExplicacaoDecisao;
}

export type OrigemConsumo = "planejado" | "editado" | "avulso";

/**
 * O que foi realmente consumido (CONTEXT.md > Consumo Confirmado).
 * Entidade distinta do planejado: `planejado` guarda o snapshot da
 * prescrição no momento da confirmação, de modo que o desvio continue
 * legível mesmo depois de o plano mudar de versão.
 */
export interface ConsumoConfirmado {
  id: string;
  refeicaoRef: string | null;
  nome: string;
  origem: OrigemConsumo;
  consumidoEm: Date;
  horaLocal: string;
  itens: ItemAlimentar[];
  macros: Macros;
  planejado: Macros | null;
}

export type ItemLinhaDoTempo =
  | { tipo: "planejada"; horaLocal: string; entrada: EntradaPlanejada }
  | { tipo: "consumo"; horaLocal: string; consumo: ConsumoConfirmado }
  | {
      tipo: "sessao";
      horaLocal: string;
      sessaoId: string;
      nome: string;
      estado: "em_andamento" | "concluida" | "abandonada";
    };

export interface PainelMacros {
  meta: Macros;
  consumido: Macros;
  restante: Macros;
}

export interface DiarioDoDia {
  dia: string;
  fuso: string;
  painel: PainelMacros;
  linhaDoTempo: ItemLinhaDoTempo[];
}
