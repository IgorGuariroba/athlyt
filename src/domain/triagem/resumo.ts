import { ETAPAS_TRIAGEM, type EtapaId, type RespostasTriagem } from "./etapas";
import { avaliarSuficiencia, etapaRespondida } from "./suficiencia";

export interface ItemResumoTriagem {
  id: EtapaId;
  titulo: string;
  respondida: boolean;
  obrigatoria: boolean;
  destrava: string;
}

export interface ResumoTriagem {
  itens: ItemResumoTriagem[];
  modoConservador: boolean;
  completo: boolean;
}

/**
 * Resumo apresentável da triagem (specs/workflow/telas/024-resumo-
 * triagem.md): checklist por seção + estado do Modo Conservador.
 * Reaproveitado pelo cartão "completar perfil" do Início.
 */
export function montarResumoTriagem(
  respostas: RespostasTriagem,
): ResumoTriagem {
  const suficiencia = avaliarSuficiencia(respostas);

  const itens: ItemResumoTriagem[] = ETAPAS_TRIAGEM.map((etapa) => ({
    id: etapa.id,
    titulo: etapa.titulo,
    respondida: etapaRespondida(etapa.id, respostas),
    obrigatoria: etapa.obrigatoria,
    destrava: etapa.destrava,
  }));

  return {
    itens,
    modoConservador: suficiencia.modoConservador,
    completo: suficiencia.completo,
  };
}
